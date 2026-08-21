import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import mongoose from "mongoose";

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
  const { connectDB } = await import("../lib/db/connect");
  const { User } = await import("../models/User");
  const { Skill } = await import("../models/Skill");
  const { Topic } = await import("../models/Topic");
  const { Subtopic } = await import("../models/Subtopic");
  const { Content } = await import("../models/Content");
  const { QuizQuestion } = await import("../models/QuizQuestion");
  const { QuizAttempt } = await import("../models/QuizAttempt");
  const { Progress } = await import("../models/Progress");
  const { CodingChallenge } = await import("../models/CodingChallenge");
  const { Submission } = await import("../models/Submission");
  const { SolutionAnalysis } = await import("../models/SolutionAnalysis");
  const { GenerationQueue } = await import("../models/GenerationQueue");
  const { AiUsageLog } = await import("../models/AiUsageLog");

  console.log("Connecting to MongoDB...");
  await connectDB();
  console.log("Connected.\n");

  const modelsToCheck = [
    User,
    Skill,
    Topic,
    Subtopic,
    Content,
    QuizQuestion,
    QuizAttempt,
    Progress,
    CodingChallenge,
    Submission,
    SolutionAnalysis,
    GenerationQueue,
    AiUsageLog,
  ] as const;

  console.log("Collection document counts:");
  console.log("─".repeat(36));

  for (const model of modelsToCheck) {
    const count = await model.countDocuments();
    console.log(
      `${model.collection.name.padEnd(24)} ${String(count).padStart(6)}`,
    );
  }

  console.log("─".repeat(40));
  console.log("\nDone.");
}

main()
  .catch((error) => {
    console.error("check-db failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => undefined);
  });
