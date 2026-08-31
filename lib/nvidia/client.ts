import type { ZodType } from "zod";

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
    throw new Error("NVIDIA LLM response was not valid JSON");
  }
}

/**
 * Generate validated JSON using NVIDIA's OpenAI-compatible Completions API.
 */
export async function generateNvidiaValidatedJson<T>(params: {
  prompt: string;
  schema: ZodType<T>;
  model?: string;
}): Promise<{
  data: T;
  keyIndex: number;
  tokensUsed: number;
  rawText: string;
}> {
  const apiKey = process.env.NVIDIA_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("NVIDIA_API_KEY is not configured.");
  }

  const modelName = params.model ?? (process.env.NVIDIA_MODEL?.trim() || "nvidia/nemotron-3-ultra-550b");
  const url = "https://integrate.api.nvidia.com/v1/chat/completions";

  // Append strict JSON output instructions to the prompt
  const finalPrompt = `${params.prompt}\n\nIMPORTANT: You must return the output strictly as a JSON object. Do not wrap the JSON in markdown code blocks, do not explain anything, and do not output any other text than raw valid JSON.`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: modelName,
      messages: [{ role: "user", content: finalPrompt }],
      temperature: 0.2,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`NVIDIA API call failed (${response.status}): ${text || response.statusText}`);
  }

  const result = await response.json();
  const rawText = result?.choices?.[0]?.message?.content?.trim();
  if (!rawText) {
    throw new Error("NVIDIA completions returned an empty response");
  }

  let parsed: unknown;
  try {
    parsed = parseJsonPayload(rawText);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${message}. Raw response was: ${rawText}`);
  }

  const validated = params.schema.safeParse(parsed);
  if (!validated.success) {
    throw new Error(
      `NVIDIA JSON failed schema validation: ${validated.error.message}. Raw: ${rawText}`
    );
  }

  // Count usage tokens if available
  const promptTokens = result?.usage?.prompt_tokens ?? 0;
  const completionTokens = result?.usage?.completion_tokens ?? 0;
  const totalTokens = result?.usage?.total_tokens ?? (promptTokens + completionTokens);

  return {
    data: validated.data,
    keyIndex: 0,
    tokensUsed: totalTokens,
    rawText,
  };
}

/**
 * Generate an image using NVIDIA Qwen-Image model and return its base64 data string.
 */
export async function generateNvidiaImage(prompt: string): Promise<string> {
  const apiKey = (process.env.NVIDIA_IMAGE_API_KEY || process.env.NVIDIA_API_KEY)?.trim();
  if (!apiKey) {
    throw new Error("NVIDIA_IMAGE_API_KEY (or NVIDIA_API_KEY) is not configured.");
  }

  const modelName = process.env.NVIDIA_IMAGE_MODEL?.trim() || "qwen/qwen-image";
  
  // Try OpenAI compatible images generation API first
  const url = "https://integrate.api.nvidia.com/v1/images/generations";

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: modelName,
      prompt,
      response_format: "b64_json",
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`NVIDIA Image API failed (${response.status}): ${text || response.statusText}`);
  }

  const result = await response.json();
  
  // Extract base64 or URL from the response
  const b64 = result?.data?.[0]?.b64_json || result?.artifacts?.[0]?.base64;
  if (b64) {
    // If the base64 doesn't have the data prefix, add it.
    if (b64.startsWith("data:image/")) {
      return b64;
    }
    return `data:image/png;base64,${b64}`;
  }

  const urlField = result?.data?.[0]?.url;
  if (urlField) {
    return urlField;
  }

  throw new Error("NVIDIA Image API did not return any image data (base64 or URL)");
}
