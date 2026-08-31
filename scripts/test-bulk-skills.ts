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

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/pathway";

async function main() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(MONGODB_URI);
  console.log("Connected successfully!");

  const { orderSkills } = await import("../lib/gemini/client");
  const { Skill } = await import("../models/Skill");
  const { Topic } = await import("../models/Topic");
  const { Subtopic } = await import("../models/Subtopic");
  const { GenerationQueue } = await import("../models/GenerationQueue");
  const { processQueueItem } = await import("../lib/queue/process");

  // 1. Test Comma-Separated AI Ordering
  const rawSkillsInput = "Kubernetes, Linux, Docker, Bash";
  const rawNames = rawSkillsInput.split(",").map((n) => n.trim()).filter((n) => n.length > 0);

  console.log("\n--- Testing AI Ordering ---");
  console.log("Original list:", rawNames);
  
  let orderedNames = rawNames;
  try {
    const orderResult = await orderSkills(rawNames);
    orderedNames = orderResult.data.skills;
    console.log("AI Ordered list:", orderedNames);
  } catch (err) {
    console.error("AI ordering failed (using fallback):", err instanceof Error ? err.message : String(err));
  }

  // 2. Test Skill Creation and Enqueuing
  console.log("\n--- Testing Skill Creation & Enqueuing ---");
  const testSkillName = `Test Skill-${Date.now()}`;
  console.log(`Creating test skill: "${testSkillName}"`);

  const skill = await Skill.create({
    name: testSkillName,
    description: `Learning path for ${testSkillName} (generating outline...)`,
    status: "active",
    source: "user-added",
    generationStatus: "generating",
  });

  const queueItem = await GenerationQueue.create({
    targetType: "skill-outline" as const,
    targetId: skill._id,
    skillId: skill._id,
    priority: 2000,
    status: "queued",
    attempts: 0,
  });

  console.log(`Created skill ID: ${skill._id}, Queue ID: ${queueItem._id}`);
  
  // Verify Mongoose state
  let refreshedSkill = await Skill.findById(skill._id).lean().exec();
  console.log(`Skill initial generationStatus: "${refreshedSkill?.generationStatus}"`);

  // 3. Test Background Queue Processing of Skill Outline
  console.log("\n--- Testing Queue Processing of 'skill-outline' ---");
  try {
    const result = await processQueueItem(queueItem._id);
    console.log("Queue processing result:", result);

    refreshedSkill = await Skill.findById(skill._id).lean().exec();
    console.log(`Skill final generationStatus: "${refreshedSkill?.generationStatus}"`);
    console.log("Skill description updated:", refreshedSkill?.description);

    // Verify topics and subtopics were generated
    const topics = await Topic.find({ skillId: skill._id }).lean().exec();
    console.log(`Generated ${topics.length} topics:`);
    for (const t of topics) {
      const subs = await Subtopic.find({ topicId: t._id }).lean().exec();
      console.log(`  - Topic: "${t.title}" with ${subs.length} subtopics.`);
    }

    // Verify subtopic-content tasks are enqueued
    const pendingJobsCount = await GenerationQueue.countDocuments({
      skillId: skill._id,
      targetType: "subtopic-content",
    }).exec();
    console.log(`Enqueued ${pendingJobsCount} subtopic-content generation jobs in the queue.`);
  } catch (error) {
    console.error("Queue outline generation failed:", error);
  }

  // Cleanup test documents
  console.log("\nCleaning up test documents...");
  await Skill.deleteOne({ _id: skill._id }).exec();
  await Topic.deleteMany({ skillId: skill._id }).exec();
  const topics = await Topic.find({ skillId: skill._id }).select("_id").lean().exec();
  const topicIds = topics.map((t) => t._id);
  await Subtopic.deleteMany({ topicId: { $in: topicIds } }).exec();
  await GenerationQueue.deleteMany({ skillId: skill._id }).exec();
  console.log("Cleanup completed.");
}

main().finally(async () => {
  await mongoose.disconnect().catch(() => undefined);
});
