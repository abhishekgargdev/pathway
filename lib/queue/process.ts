import type { Types } from "mongoose";

import { connectDB } from "@/lib/db/connect";
import {
  AllKeysExhaustedError,
  generateCodingChallenge,
  generateQuizQuestions,
  generateSubtopicContent,
  generateSkillOutline,
  readGeminiApiKey,
} from "@/lib/gemini/client";
import { AiUsageLog } from "@/models/AiUsageLog";
import { CodingChallenge } from "@/models/CodingChallenge";
import { Content } from "@/models/Content";
import {
  GenerationQueue,
  type GenerationTargetType,
  type IGenerationQueue,
} from "@/models/GenerationQueue";
import { QuizQuestion } from "@/models/QuizQuestion";
import { Skill } from "@/models/Skill";
import { Subtopic } from "@/models/Subtopic";
import { Topic } from "@/models/Topic";

export const MAX_GENERATION_ATTEMPTS = 3;
const KEY_COUNT = 6;
/** Cron uses ~70% of remaining daily quota; leave headroom for lazy generation. */
export const CRON_QUOTA_FRACTION = 0.7;

export type ProcessQueueResult =
  | { status: "done"; queueItemId: string; targetType: GenerationTargetType }
  | {
      status: "failed";
      queueItemId: string;
      targetType?: GenerationTargetType;
      error: string;
      attempts: number;
      permanent: boolean;
    }
  | {
      status: "exhausted";
      queueItemId: string;
      error: string;
    }
  | { status: "skipped"; queueItemId: string; reason: string };

type QueueDoc = IGenerationQueue & { _id: Types.ObjectId };

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

function dailyLimitPerKey(): number {
  const raw = process.env.GEMINI_DAILY_LIMIT_PER_KEY;
  const parsed = raw ? Number(raw) : 100;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 100;
}

export async function getRemainingQuotaToday(): Promise<{
  remaining: number;
  limitPerKey: number;
  configuredKeys: number;
  perKey: Array<{ keyIndex: number; used: number; remaining: number }>;
}> {
  if (process.env.AI_PROVIDER?.trim().toLowerCase() === "nvidia" && process.env.NVIDIA_API_KEY) {
    return {
      remaining: 1000,
      limitPerKey: 1000,
      configuredKeys: 1,
      perKey: [{ keyIndex: 1, used: 0, remaining: 1000 }],
    };
  }
  await connectDB();
  const date = todayDateString();
  const limitPerKey = dailyLimitPerKey();
  const perKey: Array<{ keyIndex: number; used: number; remaining: number }> =
    [];

  let remaining = 0;
  let configuredKeys = 0;

  for (let keyIndex = 1; keyIndex <= KEY_COUNT; keyIndex++) {
    if (!readGeminiApiKey(keyIndex)) continue;
    configuredKeys += 1;
    const log = await AiUsageLog.findOne({ keyIndex, date }).lean().exec();
    const used = log?.callsUsed ?? 0;
    const keyRemaining = Math.max(0, limitPerKey - used);
    remaining += keyRemaining;
    perKey.push({ keyIndex, used, remaining: keyRemaining });
  }

  return { remaining, limitPerKey, configuredKeys, perKey };
}

/** How many queue items the cron may process this run (~70% of remaining quota). */
export function cronBatchSize(remainingQuota: number): number {
  return Math.max(0, Math.floor(remainingQuota * CRON_QUOTA_FRACTION));
}

async function markParentTopicReadyIfComplete(
  topicId: Types.ObjectId,
): Promise<void> {
  const pending = await Subtopic.countDocuments({
    topicId,
    status: { $ne: "ready" },
  }).exec();
  if (pending === 0) {
    await Topic.updateOne(
      { _id: topicId },
      { $set: { status: "ready" } },
    ).exec();
  }
}

async function loadSkillContextForSubtopic(subtopicId: Types.ObjectId) {
  const subtopic = await Subtopic.findById(subtopicId).exec();
  if (!subtopic) {
    throw new Error(`Subtopic not found: ${subtopicId.toString()}`);
  }

  const topic = await Topic.findById(subtopic.topicId).exec();
  if (!topic) {
    throw new Error(`Topic not found for subtopic: ${subtopicId.toString()}`);
  }

  const skill = await Skill.findById(topic.skillId).exec();
  if (!skill) {
    throw new Error(`Skill not found for topic: ${topic._id.toString()}`);
  }

  return { subtopic, topic, skill };
}

async function processSubtopicContent(
  item: QueueDoc,
): Promise<{ keyIndex: number }> {
  if (!item.targetId) throw new Error("Queue item missing targetId");

  const { subtopic, topic, skill } = await loadSkillContextForSubtopic(
    item.targetId,
  );

  await Subtopic.updateOne(
    { _id: subtopic._id },
    { $set: { status: "generating" } },
  ).exec();

  const result = await generateSubtopicContent({
    skillName: skill.name,
    topicTitle: topic.title,
    subtopicTitle: subtopic.title,
  });

  const existing = await Content.findOne({ subtopicId: subtopic._id }).exec();

  if (existing) {
    await Content.updateOne(
      { subtopicId: subtopic._id },
      {
        $set: {
          body: result.data.body,
          examples: result.data.examples,
          generatedAt: new Date(),
          generatedByKeyIndex: result.keyIndex,
        },
        $inc: { version: 1 },
      },
    ).exec();
  } else {
    await Content.create({
      subtopicId: subtopic._id,
      body: result.data.body,
      examples: result.data.examples,
      generatedAt: new Date(),
      generatedByKeyIndex: result.keyIndex,
      version: 1,
    });
  }

  await Subtopic.updateOne(
    { _id: subtopic._id },
    { $set: { status: "ready" } },
  ).exec();

  await markParentTopicReadyIfComplete(topic._id);

  return { keyIndex: result.keyIndex };
}

async function processQuiz(item: QueueDoc): Promise<{ keyIndex: number }> {
  if (!item.targetId) throw new Error("Queue item missing targetId");

  const { subtopic, topic, skill } = await loadSkillContextForSubtopic(
    item.targetId,
  );

  const existingContent = await Content.findOne({
    subtopicId: subtopic._id,
  })
    .lean()
    .exec();

  const result = await generateQuizQuestions({
    skillName: skill.name,
    topicTitle: topic.title,
    subtopicTitle: subtopic.title,
    contentSummary: existingContent?.body?.slice(0, 2000),
  });

  await QuizQuestion.deleteMany({ subtopicId: subtopic._id }).exec();
  await QuizQuestion.insertMany(
    result.data.questions.map((q) => ({
      subtopicId: subtopic._id,
      question: q.question,
      options: q.options,
      correctAnswerIndex: q.correctAnswerIndex,
      explanation: q.explanation,
    })),
  );

  return { keyIndex: result.keyIndex };
}

async function processCodingChallenge(
  item: QueueDoc,
): Promise<{ keyIndex: number }> {
  if (!item.targetId) throw new Error("Queue item missing targetId");

  const challenge = await CodingChallenge.findById(item.targetId).exec();
  if (!challenge) {
    throw new Error(`CodingChallenge not found: ${item.targetId.toString()}`);
  }

  const skill = await Skill.findById(challenge.skillId).exec();
  if (!skill) {
    throw new Error(`Skill not found: ${challenge.skillId.toString()}`);
  }

  let topicTitle = "General";
  if (challenge.topicId) {
    const topic = await Topic.findById(challenge.topicId).exec();
    if (topic) topicTitle = topic.title;
  }

  await CodingChallenge.updateOne(
    { _id: challenge._id },
    { $set: { status: "generating" } },
  ).exec();

  const result = await generateCodingChallenge({
    skillName: skill.name,
    topicTitle,
    difficulty: challenge.difficulty,
  });

  await CodingChallenge.updateOne(
    { _id: challenge._id },
    {
      $set: {
        prompt: result.data.prompt,
        difficulty: result.data.difficulty,
        constraints: result.data.constraints,
        testCases: result.data.testCases,
        status: "ready",
      },
    },
  ).exec();

  return { keyIndex: result.keyIndex };
}

/**
 * topic-outline: targetId = Topic — generate/upsert a CodingChallenge for the topic
 * and mark the Topic ready.
 */
async function processTopicOutline(
  item: QueueDoc,
): Promise<{ keyIndex: number }> {
  if (!item.targetId) throw new Error("Queue item missing targetId");

  const topic = await Topic.findById(item.targetId).exec();
  if (!topic) {
    throw new Error(`Topic not found: ${item.targetId.toString()}`);
  }

  const skill = await Skill.findById(topic.skillId).exec();
  if (!skill) {
    throw new Error(`Skill not found: ${topic.skillId.toString()}`);
  }

  await Topic.updateOne(
    { _id: topic._id },
    { $set: { status: "generating" } },
  ).exec();

  const result = await generateCodingChallenge({
    skillName: skill.name,
    topicTitle: topic.title,
  });

  let challenge = await CodingChallenge.findOne({
    skillId: skill._id,
    topicId: topic._id,
  }).exec();

  if (challenge) {
    await CodingChallenge.updateOne(
      { _id: challenge._id },
      {
        $set: {
          prompt: result.data.prompt,
          difficulty: result.data.difficulty,
          constraints: result.data.constraints,
          testCases: result.data.testCases,
          status: "ready",
        },
      },
    ).exec();
  } else {
    challenge = await CodingChallenge.create({
      skillId: skill._id,
      topicId: topic._id,
      prompt: result.data.prompt,
      difficulty: result.data.difficulty,
      constraints: result.data.constraints,
      testCases: result.data.testCases,
      status: "ready",
    });
  }

  await Topic.updateOne(
    { _id: topic._id },
    { $set: { status: "ready" } },
  ).exec();

  return { keyIndex: result.keyIndex };
}

async function processSkillOutline(
  item: QueueDoc,
): Promise<{ keyIndex: number }> {
  if (!item.targetId) throw new Error("Queue item missing targetId");

  const skill = await Skill.findById(item.targetId).exec();
  if (!skill) {
    throw new Error(`Skill not found: ${item.targetId.toString()}`);
  }

  // Update status to generating
  await Skill.updateOne(
    { _id: skill._id },
    { $set: { generationStatus: "generating" } }
  ).exec();

  const result = await generateSkillOutline(skill.name);
  const outline = result.data;

  // Update skill description
  await Skill.updateOne(
    { _id: skill._id },
    { $set: { description: outline.description } }
  ).exec();

  const queueItems: Array<{
    targetType: "skill-outline" | "topic-outline" | "subtopic-content" | "quiz";
    targetId: string;
    skillId: string;
    priority: number;
  }> = [];

  for (const topicInput of outline.topics) {
    const topic = await Topic.create({
      skillId: skill._id,
      title: topicInput.title,
      order: topicInput.order,
      status: "pending",
    });

    for (const subInput of topicInput.subtopics) {
      const subtopic = await Subtopic.create({
        topicId: topic._id,
        title: subInput.title,
        order: subInput.order,
        status: "pending",
      });

      const base = 1000 - (topicInput.order * 20 + subInput.order);
      queueItems.push({
        targetType: "subtopic-content",
        targetId: subtopic._id.toString(),
        skillId: skill._id.toString(),
        priority: base,
      });
      queueItems.push({
        targetType: "quiz",
        targetId: subtopic._id.toString(),
        skillId: skill._id.toString(),
        priority: base - 5,
      });
    }

    queueItems.push({
      targetType: "topic-outline",
      targetId: topic._id.toString(),
      skillId: skill._id.toString(),
      priority: 100 - topicInput.order,
    });
  }

  const { enqueueGenerationMany } = await import("@/lib/queue/enqueue");
  await enqueueGenerationMany(queueItems);

  // Mark skill as ready
  await Skill.updateOne(
    { _id: skill._id },
    { $set: { generationStatus: "ready" } }
  ).exec();

  return { keyIndex: result.keyIndex };
}

async function runTargetHandler(
  item: QueueDoc,
): Promise<{ keyIndex: number }> {
  switch (item.targetType) {
    case "skill-outline":
      return processSkillOutline(item);
    case "subtopic-content":
      return processSubtopicContent(item);
    case "quiz":
      return processQuiz(item);
    case "coding-challenge":
      return processCodingChallenge(item);
    case "topic-outline":
      return processTopicOutline(item);
    default:
      throw new Error(`Unknown targetType: ${String(item.targetType)}`);
  }
}

async function failQueueItem(
  item: QueueDoc,
  errorMessage: string,
): Promise<ProcessQueueResult> {
  const attempts = (item.attempts ?? 0) + 1;
  const permanent = attempts >= MAX_GENERATION_ATTEMPTS;

  await GenerationQueue.updateOne(
    { _id: item._id },
    {
      $set: {
        status: permanent ? "failed" : "queued",
        attempts,
        lastError: errorMessage.slice(0, 2000),
      },
    },
  ).exec();

  if (permanent && item.targetType === "skill-outline" && item.targetId) {
    await Skill.updateOne(
      { _id: item.targetId },
      { $set: { generationStatus: "failed" } }
    ).exec();
  }

  return {
    status: "failed",
    queueItemId: item._id.toString(),
    targetType: item.targetType,
    error: errorMessage,
    attempts,
    permanent,
  };
}

/**
 * Process a single GenerationQueue item (cron + lazy path).
 * Claims queued → processing, runs the matching Gemini generator, persists results.
 */
export async function processQueueItem(
  queueItemId: Types.ObjectId | string,
): Promise<ProcessQueueResult> {
  await connectDB();

  const claimed = await GenerationQueue.findOneAndUpdate(
    {
      _id: queueItemId,
      status: "queued",
      attempts: { $lt: MAX_GENERATION_ATTEMPTS },
    },
    { $set: { status: "processing" } },
    { returnDocument: "after" },
  ).exec();

  if (!claimed) {
    const existing = await GenerationQueue.findById(queueItemId).lean().exec();
    return {
      status: "skipped",
      queueItemId: String(queueItemId),
      reason: existing
        ? `Item not claimable (status=${existing.status}, attempts=${existing.attempts})`
        : "Queue item not found",
    };
  }

  const item = claimed as QueueDoc;

  try {
    if (!item.targetType) {
      throw new Error("Queue item missing targetType");
    }

    await runTargetHandler(item);

    await GenerationQueue.updateOne(
      { _id: item._id },
      {
        $set: { status: "done", completedAt: new Date() },
        $unset: { lastError: 1 },
      },
    ).exec();

    return {
      status: "done",
      queueItemId: item._id.toString(),
      targetType: item.targetType,
    };
  } catch (error) {
    if (error instanceof AllKeysExhaustedError) {
      await GenerationQueue.updateOne(
        { _id: item._id },
        {
          $set: {
            status: "queued",
            lastError: error.message.slice(0, 2000),
          },
        },
      ).exec();

      return {
        status: "exhausted",
        queueItemId: item._id.toString(),
        error: error.message,
      };
    }

    const message = error instanceof Error ? error.message : String(error);
    return failQueueItem(item, message);
  }
}

/**
 * Pull top-priority queued items (attempts < max) up to `limit`.
 */
export async function pullQueuedItems(limit: number): Promise<QueueDoc[]> {
  if (limit <= 0) return [];
  await connectDB();

  const items = await GenerationQueue.find({
    status: "queued",
    attempts: { $lt: MAX_GENERATION_ATTEMPTS },
  })
    .sort({ priority: -1, createdAt: 1 })
    .limit(limit)
    .exec();

  return items as QueueDoc[];
}
