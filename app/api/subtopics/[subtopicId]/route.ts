import { Types } from "mongoose";
import { NextResponse } from "next/server";

import { requireSession, withDb } from "@/lib/api";
import { lazyEnsureSubtopicContent } from "@/lib/queue/lazy";
import type { SubtopicContentResponse } from "@/lib/subtopics/types";
import { Content } from "@/models/Content";
import { Progress } from "@/models/Progress";
import { QuizQuestion } from "@/models/QuizQuestion";
import { Skill } from "@/models/Skill";
import { Subtopic } from "@/models/Subtopic";
import { Topic } from "@/models/Topic";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export type { SubtopicContentResponse } from "@/lib/subtopics/types";

type RouteContext = { params: Promise<{ subtopicId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { error } = await requireSession();
  if (error) return error;

  const { subtopicId } = await context.params;
  if (!Types.ObjectId.isValid(subtopicId)) {
    return NextResponse.json({ error: "Invalid subtopic id" }, { status: 400 });
  }

  await withDb();
  const id = new Types.ObjectId(subtopicId);

  const subtopic = await Subtopic.findById(id).lean().exec();
  if (!subtopic) {
    return NextResponse.json({ error: "Subtopic not found" }, { status: 404 });
  }

  const topic = await Topic.findById(subtopic.topicId).lean().exec();
  if (!topic) {
    return NextResponse.json({ error: "Topic not found" }, { status: 404 });
  }

  const skill = await Skill.findById(topic.skillId).lean().exec();
  if (!skill) {
    return NextResponse.json({ error: "Skill not found" }, { status: 404 });
  }

  // Mark in-progress unless already completed
  const existingProgress = await Progress.findOne({
    skillId: skill._id,
    subtopicId: id,
  }).exec();

  if (!existingProgress) {
    await Progress.create({
      skillId: skill._id,
      topicId: topic._id,
      subtopicId: id,
      status: "in-progress",
      lastVisitedAt: new Date(),
    });
  } else if (existingProgress.status !== "completed") {
    existingProgress.status = "in-progress";
    existingProgress.lastVisitedAt = new Date();
    await existingProgress.save();
  } else {
    existingProgress.lastVisitedAt = new Date();
    await existingProgress.save();
  }

  let content = await Content.findOne({ subtopicId: id }).lean().exec();
  let responseStatus: SubtopicContentResponse["status"] = "ready";
  let message: string | undefined;

  if (!content || subtopic.status === "pending") {
    const lazy = await lazyEnsureSubtopicContent(subtopicId);
    if (lazy.status === "ready_tomorrow") {
      responseStatus = "ready_tomorrow";
      message = "Content will be ready in tomorrow's batch.";
    } else if (lazy.status === "error") {
      responseStatus = "error";
      message = lazy.message;
    } else {
      content = await Content.findOne({ subtopicId: id }).lean().exec();
      responseStatus = content ? "ready" : "generating";
    }
  }

  const quizDocs = await QuizQuestion.find({ subtopicId: id })
    .select("_id question options")
    .lean()
    .exec();

  const body: SubtopicContentResponse = {
    status: responseStatus,
    message,
    subtopic: {
      id: subtopic._id.toString(),
      title: subtopic.title,
      status: subtopic.status,
    },
    topic: {
      id: topic._id.toString(),
      title: topic.title,
    },
    skill: {
      id: skill._id.toString(),
      name: skill.name,
    },
    content: content
      ? {
          body: content.body,
          examples: content.examples ?? [],
          simplifiedExplanation: content.simplifiedExplanation ?? null,
        }
      : null,
    quiz: {
      ready: quizDocs.length > 0,
      questionCount: quizDocs.length,
      questions: quizDocs.map((q) => ({
        id: q._id.toString(),
        question: q.question,
        options: q.options,
      })),
    },
  };

  return NextResponse.json(body);
}
