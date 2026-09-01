import {
  GoogleGenerativeAI,
  type GenerateContentResult,
} from "@google/generative-ai";
import type { ZodError, ZodType } from "zod";

import { connectDB } from "@/lib/db/connect";
import { AiUsageLog } from "@/models/AiUsageLog";
import {
  codingChallengePrompt,
  quizQuestionsPrompt,
  skillOutlinePrompt,
  simplifiedExplanationPrompt,
  solutionAnalysisPrompt,
  subtopicContentPrompt,
  orderSkillsPrompt,
} from "@/lib/gemini/prompts";
import {
  codingChallengeSchema,
  quizQuestionsSchema,
  skillOutlineSchema,
  simplifiedExplanationSchema,
  solutionAnalysisSchema,
  subtopicContentSchema,
  orderedSkillsSchema,
  type CodingChallengePayload,
  type QuizQuestions,
  type SimplifiedExplanation,
  type SkillOutline,
  type SolutionAnalysisPayload,
  type SubtopicContent,
  type OrderedSkills,
} from "@/lib/gemini/schemas";

const KEY_COUNT = 6;

export class AllKeysExhaustedError extends Error {
  readonly name = "AllKeysExhaustedError";

  constructor(
    message = "All Gemini API keys have exhausted today's quota (or none are configured)",
  ) {
    super(message);
  }
}

export class GeminiValidationError extends Error {
  readonly name = "GeminiValidationError";

  constructor(
    message: string,
    readonly zodError: ZodError,
    readonly rawText: string,
  ) {
    super(message);
  }
}

declare global {
  // eslint-disable-next-line no-var
  var geminiKeyCursor: number | undefined;
}

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

function dailyLimit(): number {
  const raw = process.env.GEMINI_DAILY_LIMIT_PER_KEY;
  const parsed = raw ? Number(raw) : 100;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 100;
}

export function getGeminiModel(): string {
  return process.env.GEMINI_MODEL?.trim() || "gemini-flash-latest";
}

export function getGeminiImageModel(): string {
  return process.env.GEMINI_IMAGE_MODEL?.trim() || "gemini-2.5-flash-image";
}

/** Prefer GEMINI_KEY_N (AGENTS.md); fall back to GEMINI_API_KEY_N. */
export function readGeminiApiKey(keyIndex: number): string | undefined {
  if (keyIndex < 1 || keyIndex > KEY_COUNT) return undefined;
  const raw =
    process.env[`GEMINI_KEY_${keyIndex}`] ??
    process.env[`GEMINI_API_KEY_${keyIndex}`];
  const trimmed = raw?.trim();
  return trimmed || undefined;
}

async function getCallsUsed(keyIndex: number, date: string): Promise<number> {
  const log = await AiUsageLog.findOne({ keyIndex, date }).lean().exec();
  return log?.callsUsed ?? 0;
}

/**
 * Round-robin across keys 1..6, skipping missing keys and keys at/over daily limit.
 * Returns keys in try-order starting from the global cursor.
 */
export async function listAvailableKeys(): Promise<
  Array<{ keyIndex: number; apiKey: string }>
> {
  await connectDB();

  const date = todayDateString();
  const limit = dailyLimit();
  const start = global.geminiKeyCursor ?? 0;
  const available: Array<{ keyIndex: number; apiKey: string }> = [];

  for (let offset = 0; offset < KEY_COUNT; offset++) {
    const slot = (start + offset) % KEY_COUNT;
    const keyIndex = slot + 1;
    const apiKey = readGeminiApiKey(keyIndex);
    if (!apiKey) continue;

    const used = await getCallsUsed(keyIndex, date);
    if (used >= limit) continue;

    available.push({ keyIndex, apiKey });
  }

  if (available.length === 0) {
    throw new AllKeysExhaustedError();
  }

  return available;
}

export async function selectAvailableKey(): Promise<{
  keyIndex: number;
  apiKey: string;
}> {
  const [first] = await listAvailableKeys();
  global.geminiKeyCursor = first.keyIndex % KEY_COUNT;
  return first;
}

function isTransientGeminiError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /503|429|high demand|resource.?exhausted|unavailable|too many requests|try again later/i.test(
    message,
  );
}

export async function incrementAiUsage(params: {
  keyIndex: number;
  tokensUsed?: number;
}): Promise<void> {
  await connectDB();
  const date = todayDateString();
  const tokens = params.tokensUsed ?? 0;

  await AiUsageLog.findOneAndUpdate(
    { keyIndex: params.keyIndex, date },
    {
      $inc: { callsUsed: 1, tokensUsed: tokens },
      $setOnInsert: { keyIndex: params.keyIndex, date },
    },
    { upsert: true },
  ).exec();
}

function extractText(result: GenerateContentResult): string {
  const text = result.response.text()?.trim();
  if (!text) {
    throw new Error("Gemini returned an empty response");
  }
  return text;
}

function parseJsonPayload(rawText: string): unknown {
  const trimmed = rawText.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced?.[1]) {
      return JSON.parse(fenced[1].trim());
    }
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start !== -1 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error("Gemini response was not valid JSON");
  }
}

function usageTokens(result: GenerateContentResult): number {
  const meta = result.response.usageMetadata;
  if (!meta) return 0;
  return (
    (meta.totalTokenCount ?? 0) ||
    (meta.promptTokenCount ?? 0) + (meta.candidatesTokenCount ?? 0)
  );
}

export type GenerateJsonResult<T> = {
  data: T;
  keyIndex: number;
  tokensUsed: number;
  rawText: string;
};

async function tryGeminiGeneration<T>(params: {
  prompt: string;
  schema: ZodType<T>;
  model?: string;
}): Promise<GenerateJsonResult<T>> {
  const keys = await listAvailableKeys();
  const modelName = params.model ?? getGeminiModel();
  let lastError: Error | null = null;

  for (const { keyIndex, apiKey } of keys) {
    const client = new GoogleGenerativeAI(apiKey);
    const model = client.getGenerativeModel({
      model: modelName,
      generationConfig: {
        temperature: 0.4,
        responseMimeType: "application/json",
      },
    });

    let result: GenerateContentResult;
    try {
      result = await model.generateContent(params.prompt);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const wrapped = new Error(`Gemini API error (key ${keyIndex}): ${message}`);
      if (isTransientGeminiError(error)) {
        lastError = wrapped;
        continue;
      }
      throw wrapped;
    }

    global.geminiKeyCursor = keyIndex % KEY_COUNT;

    const rawText = extractText(result);
    const tokensUsed = usageTokens(result);

    // Quota was consumed by a successful HTTP response — record before validate.
    await incrementAiUsage({ keyIndex, tokensUsed });

    let parsed: unknown;
    try {
      parsed = parseJsonPayload(rawText);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`${message} (key ${keyIndex})`);
    }

    const validated = params.schema.safeParse(parsed);
    if (!validated.success) {
      throw new GeminiValidationError(
        `Gemini JSON failed schema validation (key ${keyIndex})`,
        validated.error,
        rawText,
      );
    }

    return {
      data: validated.data,
      keyIndex,
      tokensUsed,
      rawText,
    };
  }

  throw lastError ?? new AllKeysExhaustedError();
}

async function tryNvidiaGeneration<T>(params: {
  prompt: string;
  schema: ZodType<T>;
  model?: string;
}): Promise<GenerateJsonResult<T>> {
  const { generateNvidiaValidatedJson } = await import("@/lib/nvidia/client");
  return generateNvidiaValidatedJson(params);
}

/**
 * Calls AI Provider (Gemini or NVIDIA) with automatic failover.
 * If Primary provider's tokens or daily quota expire/fail, automatically switches to the secondary provider.
 */
export async function generateValidatedJson<T>(params: {
  prompt: string;
  schema: ZodType<T>;
  model?: string;
}): Promise<GenerateJsonResult<T>> {
  const provider = process.env.AI_PROVIDER?.trim().toLowerCase();
  const hasNvidiaKey = !!process.env.NVIDIA_API_KEY?.trim();
  const preferNvidia = provider === "nvidia";

  if (preferNvidia) {
    // NVIDIA is primary
    try {
      return await tryNvidiaGeneration(params);
    } catch (nvidiaError) {
      const msg = nvidiaError instanceof Error ? nvidiaError.message : String(nvidiaError);
      console.warn(`[AI Failover] NVIDIA API call failed (${msg}). Automatically switching to Gemini...`);
      try {
        return await tryGeminiGeneration(params);
      } catch (geminiError) {
        throw new Error(
          `Both AI Providers failed! NVIDIA error: ${msg}. Gemini error: ${geminiError instanceof Error ? geminiError.message : String(geminiError)}`,
        );
      }
    }
  }

  // Gemini is primary (default)
  try {
    return await tryGeminiGeneration(params);
  } catch (geminiError) {
    const msg = geminiError instanceof Error ? geminiError.message : String(geminiError);
    if (hasNvidiaKey) {
      console.warn(`[AI Failover] Gemini API failed or keys exhausted (${msg}). Automatically switching to NVIDIA...`);
      try {
        return await tryNvidiaGeneration(params);
      } catch (nvidiaError) {
        throw new Error(
          `Both AI Providers failed! Gemini error: ${msg}. NVIDIA error: ${nvidiaError instanceof Error ? nvidiaError.message : String(nvidiaError)}`,
        );
      }
    }
    throw geminiError;
  }
}

/** Skill create — one small outline call. */
export async function generateSkillOutline(
  skillName: string,
): Promise<GenerateJsonResult<SkillOutline>> {
  return generateValidatedJson({
    prompt: skillOutlinePrompt(skillName),
    schema: skillOutlineSchema,
  });
}

export async function generateSubtopicContent(params: {
  skillName: string;
  topicTitle: string;
  subtopicTitle: string;
}): Promise<GenerateJsonResult<SubtopicContent>> {
  return generateValidatedJson({
    prompt: subtopicContentPrompt(params),
    schema: subtopicContentSchema,
  });
}

export async function generateQuizQuestions(params: {
  skillName: string;
  topicTitle: string;
  subtopicTitle: string;
  contentSummary?: string;
}): Promise<GenerateJsonResult<QuizQuestions>> {
  return generateValidatedJson({
    prompt: quizQuestionsPrompt(params),
    schema: quizQuestionsSchema,
  });
}

export async function generateCodingChallenge(params: {
  skillName: string;
  topicTitle: string;
  difficulty?: "easy" | "medium" | "hard";
}): Promise<GenerateJsonResult<CodingChallengePayload>> {
  return generateValidatedJson({
    prompt: codingChallengePrompt(params),
    schema: codingChallengeSchema,
  });
}

export async function generateSolutionAnalysis(params: {
  skillName: string;
  challengePrompt: string;
  language: string;
  code: string;
}): Promise<GenerateJsonResult<SolutionAnalysisPayload>> {
  return generateValidatedJson({
    prompt: solutionAnalysisPrompt(params),
    schema: solutionAnalysisSchema,
  });
}

export async function generateSimplifiedExplanation(params: {
  skillName: string;
  topicTitle: string;
  subtopicTitle: string;
  contentSummary?: string;
}): Promise<GenerateJsonResult<SimplifiedExplanation>> {
  return generateValidatedJson({
    prompt: simplifiedExplanationPrompt(params),
    schema: simplifiedExplanationSchema,
  });
}

export async function orderSkills(
  skills: string[],
): Promise<GenerateJsonResult<OrderedSkills>> {
  return generateValidatedJson({
    prompt: orderSkillsPrompt(skills),
    schema: orderedSkillsSchema,
  });
}
