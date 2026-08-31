import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import mongoose from "mongoose";
import { z } from "zod";

function loadEnvFile() {
  const envPath = resolve(process.cwd(), ".env");
  if (!existsSync(envPath)) return;

  const content = readFileSync(envPath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;

    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();

    if (!value.startsWith('"') && !value.startsWith("'")) {
      const commentAt = value.indexOf(" #");
      if (commentAt !== -1) {
        value = value.slice(0, commentAt).trim();
      }
    }

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

loadEnvFile();

const testSchema = z.object({
  topic: z.string(),
  keywords: z.array(z.string()),
});

async function main() {
  const apiKey = process.env.NVIDIA_API_KEY;
  const imageApiKey = process.env.NVIDIA_IMAGE_API_KEY || apiKey;

  console.log("NVIDIA_API_KEY configured:", apiKey ? "Yes" : "No");
  console.log("NVIDIA_IMAGE_API_KEY configured:", imageApiKey ? "Yes" : "No");
  console.log("AI_PROVIDER active:", process.env.AI_PROVIDER);
  console.log("NVIDIA Model:", process.env.NVIDIA_MODEL || "nvidia/nemotron-3-ultra-550b");
  console.log("NVIDIA Image Model:", process.env.NVIDIA_IMAGE_MODEL || "qwen/qwen-image");

  if (!apiKey || apiKey.includes("placeholder")) {
    console.log("\nSkipping live API calls: NVIDIA_API_KEY is not configured or is a placeholder.");
    return;
  }

  const { generateNvidiaValidatedJson, generateNvidiaImage } = await import("../lib/nvidia/client");

  // 1. Test completions
  console.log("\n--- Testing NVIDIA Completions (nemotron) ---");
  try {
    const result = await generateNvidiaValidatedJson({
      prompt: "Generate a list of 3 keywords for the topic 'Recursion' as a JSON object with 'topic' and 'keywords' fields.",
      schema: testSchema,
    });
    console.log("Response data:", result.data);
    console.log("Tokens used:", result.tokensUsed);
  } catch (error) {
    console.error("NVIDIA Completions test failed:", error);
  }

  // 2. Test image generation
  console.log("\n--- Testing NVIDIA Image Generation (Qwen-Image) ---");
  try {
    const prompt = "A clean vector icon representing binary tree data structure, high resolution, dark mode friendly.";
    console.log(`Prompt: "${prompt}"`);
    const base64 = await generateNvidiaImage(prompt);
    console.log("Image generation successful!");
    console.log(`Image data prefix: ${base64.slice(0, 50)}...`);
    console.log(`Image data total length: ${base64.length} bytes`);
  } catch (error) {
    console.error("NVIDIA Image Generation test failed:", error);
  }
}

main().finally(async () => {
  await mongoose.disconnect().catch(() => undefined);
});
