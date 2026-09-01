import { Types } from "mongoose";
import { NextResponse } from "next/server";

import { requireSession, withDb } from "@/lib/api";
import { generateSkillOutline } from "@/lib/gemini/client";
import { generateSubtopicContentDirect, lazyEnsureQuizQuestions } from "@/lib/queue/lazy";
import { processQueueItem } from "@/lib/queue/process";
import { Content } from "@/models/Content";
import { GenerationQueue } from "@/models/GenerationQueue";
import { QuizQuestion } from "@/models/QuizQuestion";
import { Skill } from "@/models/Skill";
import { Subtopic } from "@/models/Subtopic";
import { Topic } from "@/models/Topic";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Max allowed serverless timeout for direct generation

type RouteContext = { params: Promise<{ skillId: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const { error } = await requireSession();
  if (error) return error;

  const { skillId } = await context.params;
  if (!Types.ObjectId.isValid(skillId)) {
    return NextResponse.json({ error: "Invalid skill ID" }, { status: 400 });
  }

  await withDb();
  const sId = new Types.ObjectId(skillId);

  const skill = await Skill.findById(sId).exec();
  if (!skill) {
    return NextResponse.json({ error: "Skill not found" }, { status: 404 });
  }

  let processedCount = 0;

  // 1. If skill has no topics yet, generate outline immediately
  let topics = await Topic.find({ skillId: sId }).sort({ order: 1 }).lean().exec();
  if (topics.length === 0) {
    const outlineQueue = await GenerationQueue.findOne({
      skillId: sId,
      targetType: "skill-outline",
    }).exec();

    if (outlineQueue) {
      await processQueueItem(outlineQueue._id);
      processedCount++;
    } else {
      // Direct outline generation fallback
      await Skill.updateOne({ _id: sId }, { $set: { generationStatus: "generating" } }).exec();
      const outlineRes = await generateSkillOutline(skill.name);
      const outline = outlineRes.data;

      await Skill.updateOne({ _id: sId }, { $set: { description: outline.description } }).exec();

      for (const topicInput of outline.topics) {
        const topic = await Topic.create({
          skillId: sId,
          title: topicInput.title,
          order: topicInput.order,
          status: "pending",
        });

        for (const subInput of topicInput.subtopics) {
          await Subtopic.create({
            topicId: topic._id,
            title: subInput.title,
            order: subInput.order,
            status: "pending",
          });
        }
      }
      processedCount++;
    }

    topics = await Topic.find({ skillId: sId }).sort({ order: 1 }).lean().exec();
  }

  // 2. Process all pending queue items for this skill in concurrent chunks (3 at a time)
  const queueItems = await GenerationQueue.find({
    skillId: sId,
    status: { $in: ["queued", "failed"] },
  })
    .sort({ priority: -1 })
    .exec();

  const CONCURRENCY = 3;
  for (let i = 0; i < queueItems.length; i += CONCURRENCY) {
    const chunk = queueItems.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      chunk.map((item) => processQueueItem(item._id)),
    );

    for (const res of results) {
      if (res.status === "fulfilled" && res.value.status === "done") {
        processedCount++;
      }
    }
  }

  // 3. For any subtopics still missing content or quizzes, generate directly
  const topicIds = topics.map((t) => t._id);
  const subtopics = await Subtopic.find({ topicId: { $in: topicIds } }).lean().exec();

  for (let i = 0; i < subtopics.length; i += CONCURRENCY) {
    const chunk = subtopics.slice(i, i + CONCURRENCY);
    await Promise.allSettled(
      chunk.map(async (sub) => {
        const hasContent = await Content.exists({ subtopicId: sub._id });
        if (!hasContent) {
          const res = await generateSubtopicContentDirect(sub._id);
          if (res.status === "ready") processedCount++;
        }

        const hasQuiz = await QuizQuestion.exists({ subtopicId: sub._id });
        if (!hasQuiz) {
          const res = await lazyEnsureQuizQuestions(sub._id.toString());
          if (res.status === "ready") processedCount++;
        }
      }),
    );
  }

  // Mark skill as ready
  await Skill.updateOne({ _id: sId }, { $set: { generationStatus: "ready" } }).exec();

  return NextResponse.json({
    success: true,
    processedCount,
    message: "Instant content generation complete! Your learning materials are ready.",
  });
}
