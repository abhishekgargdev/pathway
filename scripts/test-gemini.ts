import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import mongoose from "mongoose";

const HARDCODED_SKILL_NAME = "TypeScript Fundamentals";

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

    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadEnvFile();

async function main() {
  const { generateSkillOutline, getGeminiModel, AllKeysExhaustedError } =
    await import("../lib/gemini/client");

  console.log(`Model: ${getGeminiModel()}`);
  console.log(`Generating outline for: "${HARDCODED_SKILL_NAME}"\n`);

  try {
    const result = await generateSkillOutline(HARDCODED_SKILL_NAME);
    console.log(`Used key index: ${result.keyIndex}`);
    console.log(`Tokens used: ${result.tokensUsed}`);
    console.log("\nValidated outline JSON:");
    console.log(JSON.stringify(result.data, null, 2));
  } catch (error) {
    if (error instanceof AllKeysExhaustedError) {
      console.error("AllKeysExhaustedError:", error.message);
    } else {
      console.error("test-gemini failed:", error);
    }
    process.exitCode = 1;
  }
}

main().finally(async () => {
  await mongoose.disconnect().catch(() => undefined);
});
