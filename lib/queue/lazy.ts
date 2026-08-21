import { Types } from "mongoose";

import { connectDB } from "@/lib/db/connect";
import {
  AllKeysExhaustedError,
  generateQuizQuestions,
  generateSimplifiedExplanation,
  generateSubtopicContent,
  listAvailableKeys,
} from "@/lib/gemini/client";
import { enqueueGeneration } from "@/lib/queue/enqueue";
import { processQueueItem } from "@/lib/queue/process";
import { Content } from "@/models/Content";
import { GenerationQueue } from "@/models/GenerationQueue";
import { QuizQuestion } from "@/models/QuizQuestion";
import { Skill } from "@/models/Skill";
import { Subtopic } from "@/models/Subtopic";
import { Topic } from "@/models/Topic";

export type LazyContentResult =
  | { status: "ready" }
  | { status: "ready_tomorrow" }
  | { status: "error"; message: string };

async function loadContext(subtopicId: Types.ObjectId) {
  const subtopic = await Subtopic.findById(subtopicId).exec();
  if (!subtopic) throw new Error("Subtopic not found");
  const topic = await Topic.findById(subtopic.topicId).exec();
  if (!topic) throw new Error("Topic not found");
  const skill = await Skill.findById(topic.skillId).exec();
  if (!skill) throw new Error("Skill not found");
  return { subtopic, topic, skill };
}

async function hasQuota(): Promise<boolean> {
  try {
    const keys = await listAvailableKeys();
    return keys.length > 0;
  } catch (error) {
    if (error instanceof AllKeysExhaustedError) return false;
    throw error;
  }
}

/**
 * Lazy-generate subtopic Content if missing. Uses existing queue row when present.
 */
export async function lazyEnsureSubtopicContent(
  subtopicId: string,
): Promise<LazyContentResult> {
  await connectDB();
  if (!Types.ObjectId.isValid(subtopicId)) {
    return { status: "error", message: "Invalid subtopic id" };
  }

  const id = new Types.ObjectId(subtopicId);
  const existing = await Content.findOne({ subtopicId: id }).lean().exec();
  if (existing) {
    await Subtopic.updateOne(
      { _id: id, status: { $ne: "ready" } },
      { $set: { status: "ready" } },
    ).exec();
    return { status: "ready" };
  }

  if (!(await hasQuota())) {
    return { status: "ready_tomorrow" };
  }

  let queueItem = await GenerationQueue.findOne({
    targetType: "subtopic-content",
    targetId: id,
    status: { $in: ["queued", "failed"] },
    attempts: { $lt: 3 },
  }).exec();

  if (queueItem && queueItem.status === "failed") {
    await GenerationQueue.updateOne(
      { _id: queueItem._id },
      { $set: { status: "queued" } },
    ).exec();
  }

  if (!queueItem) {
    const { topic } = await loadContext(id);
    queueItem = await GenerationQueue.create({
      targetType: "subtopic-content",
      targetId: id,
      skillId: topic.skillId,
      priority: 1000,
      status: "queued",
      attempts: 0,
    });
  }

  try {
    const result = await processQueueItem(queueItem._id);
    if (result.status === "exhausted") {
      return { status: "ready_tomorrow" };
    }
    if (result.status === "done") {
      return { status: "ready" };
    }
    if (result.status === "failed" && result.permanent) {
      return { status: "error", message: result.error };
    }
    // Soft fail — check if content landed anyway
    const content = await Content.findOne({ subtopicId: id }).lean().exec();
    if (content) return { status: "ready" };
    return {
      status: "error",
      message: result.status === "failed" ? result.error : "Generation skipped",
    };
  } catch (error) {
    if (error instanceof AllKeysExhaustedError) {
      return { status: "ready_tomorrow" };
    }
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Generation failed",
    };
  }
}

/**
 * Lazy-generate quiz questions if none exist for the subtopic.
 */
export async function lazyEnsureQuizQuestions(
  subtopicId: string,
): Promise<LazyContentResult> {
  await connectDB();
  if (!Types.ObjectId.isValid(subtopicId)) {
    return { status: "error", message: "Invalid subtopic id" };
  }

  const id = new Types.ObjectId(subtopicId);
  const count = await QuizQuestion.countDocuments({ subtopicId: id }).exec();
  if (count > 0) return { status: "ready" };

  if (!(await hasQuota())) {
    return { status: "ready_tomorrow" };
  }

  let queueItem = await GenerationQueue.findOne({
    targetType: "quiz",
    targetId: id,
    status: { $in: ["queued", "failed"] },
    attempts: { $lt: 3 },
  }).exec();

  if (queueItem && queueItem.status === "failed") {
    await GenerationQueue.updateOne(
      { _id: queueItem._id },
      { $set: { status: "queued" } },
    ).exec();
  }

  if (!queueItem) {
    const { topic } = await loadContext(id);
    queueItem = await enqueueGeneration({
      targetType: "quiz",
      targetId: id,
      skillId: topic.skillId,
      priority: 900,
    });
  }

  if (!queueItem) {
    // Direct generation fallback
    try {
      const { subtopic, topic, skill } = await loadContext(id);
      const existingContent = await Content.findOne({ subtopicId: id })
        .lean()
        .exec();
      const result = await generateQuizQuestions({
        skillName: skill.name,
        topicTitle: topic.title,
        subtopicTitle: subtopic.title,
        contentSummary: existingContent?.body?.slice(0, 2000),
      });
      await QuizQuestion.insertMany(
        result.data.questions.map((q) => ({
          subtopicId: id,
          question: q.question,
          options: q.options,
          correctAnswerIndex: q.correctAnswerIndex,
          explanation: q.explanation,
        })),
      );
      return { status: "ready" };
    } catch (error) {
      if (error instanceof AllKeysExhaustedError) {
        return { status: "ready_tomorrow" };
      }
      return {
        status: "error",
        message: error instanceof Error ? error.message : "Quiz generation failed",
      };
    }
  }

  try {
    const result = await processQueueItem(queueItem._id);
    if (result.status === "exhausted") return { status: "ready_tomorrow" };
    if (result.status === "done") return { status: "ready" };
    const again = await QuizQuestion.countDocuments({ subtopicId: id }).exec();
    if (again > 0) return { status: "ready" };
    return {
      status: "error",
      message: result.status === "failed" ? result.error : "Quiz generation skipped",
    };
  } catch (error) {
    if (error instanceof AllKeysExhaustedError) {
      return { status: "ready_tomorrow" };
    }
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Quiz generation failed",
    };
  }
}

export async function ensureSimplifiedExplanation(
  subtopicId: Types.ObjectId,
): Promise<string | null> {
  await connectDB();
  const content = await Content.findOne({ subtopicId }).exec();
  if (content?.simplifiedExplanation) {
    return content.simplifiedExplanation;
  }

  if (!(await hasQuota())) {
    return null;
  }

  const { subtopic, topic, skill } = await loadContext(subtopicId);
  try {
    const result = await generateSimplifiedExplanation({
      skillName: skill.name,
      topicTitle: topic.title,
      subtopicTitle: subtopic.title,
      contentSummary: content?.body?.slice(0, 2500),
    });

    await Content.findOneAndUpdate(
      { subtopicId },
      {
        $set: {
          simplifiedExplanation: result.data.explanation,
          simplifiedExplanationAt: new Date(),
        },
      },
      { upsert: false },
    ).exec();

    // If content doc missing, still return the explanation without cache
    if (!content) {
      return result.data.explanation;
    }

    return result.data.explanation;
  } catch (error) {
    if (error instanceof AllKeysExhaustedError) return null;
    console.error("simplified explanation failed", error);
    return null;
  }
}

/** Direct content gen used when queue process is awkward — still respects quota. */
export async function generateSubtopicContentDirect(
  subtopicId: Types.ObjectId,
): Promise<LazyContentResult> {
  if (!(await hasQuota())) return { status: "ready_tomorrow" };

  try {
    const { subtopic, topic, skill } = await loadContext(subtopicId);
    await Subtopic.updateOne(
      { _id: subtopicId },
      { $set: { status: "generating" } },
    ).exec();

    const result = await generateSubtopicContent({
      skillName: skill.name,
      topicTitle: topic.title,
      subtopicTitle: subtopic.title,
    });

    await Content.findOneAndUpdate(
      { subtopicId },
      {
        $set: {
          body: result.data.body,
          examples: result.data.examples,
          generatedAt: new Date(),
          generatedByKeyIndex: result.keyIndex,
        },
        $setOnInsert: { subtopicId, version: 1 },
        $inc: { version: 1 },
      },
      { upsert: true },
    ).exec();

    await Subtopic.updateOne(
      { _id: subtopicId },
      { $set: { status: "ready" } },
    ).exec();

    return { status: "ready" };
  } catch (error) {
    if (error instanceof AllKeysExhaustedError) {
      return { status: "ready_tomorrow" };
    }
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Generation failed",
    };
  }
}
