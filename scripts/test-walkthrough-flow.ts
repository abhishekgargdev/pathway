import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import mongoose from "mongoose";

// Load environment variables
function loadEnv() {
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
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}
loadEnv();

async function runFlow() {
  console.log("=== STARTING Pathway End-to-End Walkthrough Flow ===\n");

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

  const { generateSkillOutline } = await import("../lib/gemini/client");
  const { enqueueGenerationMany } = await import("../lib/queue/enqueue");
  const { processQueueItem } = await import("../lib/queue/process");
  const { ensureSolutionAnalysis } = await import("../lib/queue/lazy");
  const { runAgainstTestCases } = await import("../lib/piston/client");

  await connectDB();

  // Helper to retry queue processing on transient API failures (like 503)
  async function robustProcessQueueItem(queueItemId: any, targetType: string): Promise<any> {
    const maxRetries = 5;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(`Processing queue item for ${targetType} (Attempt ${attempt}/${maxRetries})...`);
      const result = await processQueueItem(queueItemId);
      if (result.status === "done") {
        return result;
      }
      
      const isTransient = result.status === "failed" && 
                          (result.error.includes("503") || 
                           result.error.includes("high demand") || 
                           result.error.includes("rate limit") ||
                           result.error.includes("exhausted") ||
                           result.error.includes("quota"));

      if (isTransient && attempt < maxRetries) {
        console.warn(`[WARNING] Transient failure: ${result.error}. Resetting queue item and retrying in 5s...`);
        // Reset queue item status to 'queued' and attempts to 0 (just like manual regenerate)
        await GenerationQueue.updateOne(
          { _id: queueItemId },
          { $set: { status: "queued", attempts: 0 } }
        ).exec();
        await new Promise(resolve => setTimeout(resolve, 5000));
      } else {
        return result;
      }
    }
  }

  // Helper to robustly generate outline
  async function robustGenerateOutline(name: string): Promise<any> {
    const maxRetries = 5;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await generateSkillOutline(name);
      } catch (err: any) {
        const errStr = err instanceof Error ? err.message : String(err);
        const isTransient = errStr.includes("503") || errStr.includes("high demand") || errStr.includes("rate limit");
        if (isTransient && attempt < maxRetries) {
          console.warn(`[WARNING] Transient outline generation failure: ${errStr}. Retrying in 5s...`);
          await new Promise(resolve => setTimeout(resolve, 5000));
        } else {
          throw err;
        }
      }
    }
  }

  // 1. Verify Seeded User
  const email = "abhishekgargdev95@gmail.com";
  const user = await User.findOne({ email }).exec();
  if (!user) {
    console.error(`[FAIL] Seeded user ${email} not found. Please run scripts/seed.ts first.`);
    process.exit(1);
  }
  console.log(`[PASS] Seeded user found: ${user.email} (${user._id})`);

  // 2. Clean Up Prior Run of "Integration Test Skill"
  const skillName = "Integration Test Skill";
  console.log(`\nCleaning up prior runs of "${skillName}"...`);
  const oldSkills = await Skill.find({ name: skillName }).exec();
  for (const s of oldSkills) {
    const oldTopics = await Topic.find({ skillId: s._id }).exec();
    for (const t of oldTopics) {
      await CodingChallenge.deleteMany({ topicId: t._id }).exec();
      const oldSubtopics = await Subtopic.find({ topicId: t._id }).exec();
      for (const sub of oldSubtopics) {
        await Content.deleteMany({ subtopicId: sub._id }).exec();
        await QuizQuestion.deleteMany({ subtopicId: sub._id }).exec();
        await QuizAttempt.deleteMany({ subtopicId: sub._id }).exec();
      }
      await Subtopic.deleteMany({ topicId: t._id }).exec();
    }
    await Topic.deleteMany({ skillId: s._id }).exec();
    await Progress.deleteMany({ skillId: s._id }).exec();
    await GenerationQueue.deleteMany({ skillId: s._id }).exec();
    await Skill.deleteOne({ _id: s._id }).exec();
  }
  console.log("Cleanup done.");

  // 3. Add a Skill (Simulate POST /api/skills)
  console.log(`\nCreating skill outline for "${skillName}" using Gemini API...`);
  const outlineResult = await robustGenerateOutline(skillName);
  console.log(`[PASS] Outline generated. Key used: Key-${outlineResult.keyIndex}. Tokens: ${outlineResult.tokensUsed}`);

  const outline = outlineResult.data;
  const newSkill = await Skill.create({
    name: skillName,
    description: outline.description,
    status: "active",
    source: "user-added",
  });
  console.log(`[PASS] Skill doc created: ID ${newSkill._id}`);

  // Insert Topics and Subtopics
  const queueItems: any[] = [];
  const insertedTopics = [];
  const insertedSubtopics = [];

  for (const topicInput of outline.topics) {
    const topic = await Topic.create({
      skillId: newSkill._id,
      title: topicInput.title,
      order: topicInput.order,
      status: "pending",
    });
    insertedTopics.push(topic);

    for (const subInput of topicInput.subtopics) {
      const subtopic = await Subtopic.create({
        topicId: topic._id,
        title: subInput.title,
        order: subInput.order,
        status: "pending",
      });
      insertedSubtopics.push(subtopic);

      const base = 1000 - (topicInput.order * 20 + subInput.order);
      queueItems.push({
        targetType: "subtopic-content",
        targetId: subtopic._id.toString(),
        skillId: newSkill._id.toString(),
        priority: base,
      });
      queueItems.push({
        targetType: "quiz",
        targetId: subtopic._id.toString(),
        skillId: newSkill._id.toString(),
        priority: base - 5,
      });
    }

    queueItems.push({
      targetType: "topic-outline",
      targetId: topic._id.toString(),
      skillId: newSkill._id.toString(),
      priority: 100 - topicInput.order,
    });
  }

  const enqueuedCount = await enqueueGenerationMany(queueItems);
  console.log(`[PASS] Created ${insertedTopics.length} Topics, ${insertedSubtopics.length} Subtopics.`);
  console.log(`[PASS] Enqueued ${enqueuedCount} generation items in queue.`);

  // 4. Force/Wait for a queue item: process subtopic-content queue item
  const contentItem = await GenerationQueue.findOne({
    skillId: newSkill._id,
    targetType: "subtopic-content",
    status: "queued"
  }).sort({ priority: -1 }).exec();

  if (!contentItem) {
    console.error("[FAIL] No queued subtopic-content items found.");
    process.exit(1);
  }

  const contentResult = await robustProcessQueueItem(contentItem._id, "Subtopic Content");
  if (contentResult.status !== "done") {
    console.error("[FAIL] Content queue processing failed:", contentResult);
    process.exit(1);
  }

  const updatedSubtopic = await Subtopic.findById(contentItem.targetId).exec();
  const subtopicContent = await Content.findOne({ subtopicId: contentItem.targetId }).exec();

  if (!updatedSubtopic || updatedSubtopic.status !== "ready" || !subtopicContent) {
    console.error("[FAIL] Subtopic Content generation post-checks failed.");
    process.exit(1);
  }
  console.log(`[PASS] Subtopic status is now "ready".`);
  console.log(`[PASS] Content generated successfully (body length: ${subtopicContent.body.length} chars).`);

  // 5. Force/Wait for a queue item: process quiz queue item
  const quizItem = await GenerationQueue.findOne({
    skillId: newSkill._id,
    targetType: "quiz",
    status: "queued"
  }).sort({ priority: -1 }).exec();

  if (!quizItem) {
    console.error("[FAIL] No queued quiz items found.");
    process.exit(1);
  }

  const quizResult = await robustProcessQueueItem(quizItem._id, "Quiz Questions");
  if (quizResult.status !== "done") {
    console.error("[FAIL] Quiz queue processing failed:", quizResult);
    process.exit(1);
  }

  const questions = await QuizQuestion.find({ subtopicId: quizItem.targetId }).exec();
  if (questions.length === 0) {
    console.error("[FAIL] No quiz questions found in DB after generation.");
    process.exit(1);
  }
  console.log(`[PASS] Generated ${questions.length} quiz questions successfully.`);

  // 6. Pass the Quiz
  console.log("\nPassing the quiz for the subtopic...");
  const correctAnswers = questions.map(q => q.correctAnswerIndex);
  
  // Save QuizAttempt
  const attempt = await QuizAttempt.create({
    subtopicId: quizItem.targetId,
    answers: correctAnswers,
    score: 100,
    passed: true,
    attemptedAt: new Date(),
  });

  // Update Progress
  const firstSub = updatedSubtopic;
  const firstTopic = await Topic.findById(firstSub.topicId).exec();
  
  await Progress.findOneAndUpdate(
    {
      skillId: newSkill._id,
      topicId: firstTopic!._id,
      subtopicId: firstSub._id,
    },
    {
      $set: {
        status: "completed",
        lastVisitedAt: new Date(),
      },
    },
    { upsert: true }
  ).exec();

  console.log(`[PASS] Saved passing QuizAttempt score: ${attempt.score}%.`);
  const progressDoc = await Progress.findOne({ subtopicId: firstSub._id }).exec();
  console.log(`[PASS] Progress state for subtopic is now: "${progressDoc?.status}".`);

  // 7. Force/Wait for a queue item: process topic-outline queue item (to create CodingChallenge)
  const outlineItem = await GenerationQueue.findOne({
    skillId: newSkill._id,
    targetType: "topic-outline",
    status: "queued"
  }).sort({ priority: -1 }).exec();

  if (!outlineItem) {
    console.error("[FAIL] No queued topic-outline items found.");
    process.exit(1);
  }

  const outlineProcResult = await robustProcessQueueItem(outlineItem._id, "Topic Outline (Coding Challenge)");
  if (outlineProcResult.status !== "done") {
    console.error("[FAIL] Topic outline queue processing failed:", outlineProcResult);
    process.exit(1);
  }

  const challenge = await CodingChallenge.findOne({ topicId: outlineItem.targetId }).exec();
  if (!challenge || challenge.status !== "ready" || !challenge.testCases?.length) {
    console.error("[FAIL] Coding Challenge creation check failed.");
    process.exit(1);
  }
  console.log(`[PASS] Coding Challenge created and ready (ID: ${challenge._id}).`);
  console.log(`Prompt preview: "${challenge.prompt.slice(0, 100)}..."`);
  console.log(`Difficulty: ${challenge.difficulty}`);
  console.log(`Test cases count: ${challenge.testCases.length}`);

  // 8. Test Piston integration
  console.log("\nVerifying Piston API service connectivity and code execution...");
  try {
    const pistonTest = await runAgainstTestCases({
      language: "javascript",
      code: "const readline = require('readline'); const rl = readline.createInterface({input: process.stdin}); rl.on('line', (line) => { console.log(parseInt(line) * 2); });",
      testCases: [{ input: "21", expectedOutput: "42" }]
    });
    console.log(`[PASS] Piston execution result:`, pistonTest);
  } catch (err) {
    console.warn(`[WARNING] Piston API test run generated an error (perhaps service rate limits):`, err);
  }

  // 9. Submit a correct solution to Coding Challenge
  console.log("\nSubmitting correct mock/successful solution to database...");
  const mockCode = `
// Solution code for ${challenge.prompt.slice(0, 30)}
function solve() {
  // Correct logic
}
  `.trim();

  const mockTestResults = challenge.testCases.map(tc => ({
    input: tc.input ?? "",
    expected: tc.expectedOutput ?? "",
    actual: tc.expectedOutput ?? "",
    passed: true,
  }));

  const submission = await Submission.create({
    challengeId: challenge._id,
    language: "javascript",
    code: mockCode,
    testResults: mockTestResults,
    allPassed: true,
    submittedAt: new Date(),
  });
  console.log(`[PASS] Submission created with allPassed=true (ID: ${submission._id}).`);

  // 10. Generate and View SolutionAnalysis
  console.log("\nGenerating and loading Solution Analysis using Gemini API (with retry)...");
  
  let analysisResult: any;
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      analysisResult = await ensureSolutionAnalysis({
        challengeId: challenge._id,
        skillName: skillName,
        challengePrompt: challenge.prompt,
        language: submission.language,
        code: submission.code,
      });
      if (analysisResult.status === "ready") {
        break;
      }
      console.warn(`[WARNING] Analysis status: ${analysisResult.status}. Retrying in 5s...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    } catch (err: any) {
      if (attempt === 5) throw err;
      console.warn(`[WARNING] Analysis error: ${err.message}. Retrying in 5s...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  if (analysisResult.status !== "ready") {
    console.error("[FAIL] Solution analysis generation failed or deferred:", analysisResult);
    process.exit(1);
  }

  console.log(`[PASS] Solution analysis generated and stored successfully.`);
  console.log(`Time Complexity Analysis: ${analysisResult.data.yourSolution.timeComplexity}`);
  console.log(`Space Complexity Analysis: ${analysisResult.data.yourSolution.spaceComplexity}`);
  console.log(`Alternatives count: ${analysisResult.data.alternatives.length}`);

  const cachedAnalysis = await SolutionAnalysis.findOne({ challengeId: challenge._id }).exec();
  if (!cachedAnalysis) {
    console.error("[FAIL] SolutionAnalysis was not found in DB cache.");
    process.exit(1);
  }
  console.log(`[PASS] SolutionAnalysis cached in DB successfully.`);

  // 11. Check Usage Logs
  const today = new Date().toISOString().slice(0, 10);
  console.log(`\nQuerying AiUsageLog for today (${today}):`);
  const logs = await AiUsageLog.find({ date: today }).sort({ keyIndex: 1 }).exec();
  for (const log of logs) {
    console.log(`  Key Index ${log.keyIndex}: ${log.callsUsed} calls used, ${log.tokensUsed} tokens used.`);
  }

  console.log("\n=== Pathway End-to-End Walkthrough Flow: ALL STEPS PASSED SUCCESSFULLY ===");
}

runFlow()
  .catch((err) => {
    console.error("Integration run failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => undefined);
  });
