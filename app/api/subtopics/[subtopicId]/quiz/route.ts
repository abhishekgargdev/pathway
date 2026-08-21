import { Types } from "mongoose";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireSession, withDb } from "@/lib/api";
import {
  ensureSimplifiedExplanation,
  lazyEnsureQuizQuestions,
} from "@/lib/queue/lazy";
import type { QuizSubmitResponse } from "@/lib/subtopics/types";
import { Content } from "@/models/Content";
import { Progress } from "@/models/Progress";
import { QuizAttempt } from "@/models/QuizAttempt";
import { QuizQuestion } from "@/models/QuizQuestion";
import { Subtopic } from "@/models/Subtopic";
import { Topic } from "@/models/Topic";
import { Skill } from "@/models/Skill";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export type { QuizSubmitResponse } from "@/lib/subtopics/types";

const PASS_THRESHOLD = 0.7;

type RouteContext = { params: Promise<{ subtopicId: string }> };

const submitSchema = z.object({
  answers: z.array(z.number().int()),
});

/** GET quiz questions (without answers) — triggers lazy quiz generation if needed. */
export async function GET(_request: Request, context: RouteContext) {
  const { session, error } = await requireSession();
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

  const skill = await Skill.findOne({ _id: topic.skillId, userId: session!.user.id }).lean().exec();
  if (!skill) {
    return NextResponse.json({ error: "Skill not found or unauthorized" }, { status: 404 });
  }

  let questions = await QuizQuestion.find({ subtopicId: id }).lean().exec();

  if (questions.length === 0) {
    const lazy = await lazyEnsureQuizQuestions(subtopicId);
    if (lazy.status === "ready_tomorrow") {
      return NextResponse.json({
        status: "ready_tomorrow",
        message: "Quiz will be ready in tomorrow's batch.",
        questions: [],
      });
    }
    if (lazy.status === "error") {
      return NextResponse.json(
        { status: "error", error: lazy.message, questions: [] },
        { status: 502 },
      );
    }
    questions = await QuizQuestion.find({ subtopicId: id }).lean().exec();
  }

  const content = await Content.findOne({ subtopicId: id })
    .select("simplifiedExplanation")
    .lean()
    .exec();

  return NextResponse.json({
    status: "ready",
    skillId: topic.skillId.toString(),
    subtopic: { id: subtopic._id.toString(), title: subtopic.title },
    questions: questions.map((q) => ({
      id: q._id.toString(),
      question: q.question,
      options: q.options,
      // Single-user app: allow immediate client feedback after selection.
      correctAnswerIndex: q.correctAnswerIndex,
      explanation: q.explanation ?? null,
    })),
    simplifiedExplanation: content?.simplifiedExplanation ?? null,
  });
}

export async function POST(request: Request, context: RouteContext) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { subtopicId } = await context.params;
  if (!Types.ObjectId.isValid(subtopicId)) {
    return NextResponse.json({ error: "Invalid subtopic id" }, { status: 400 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = submitSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "answers must be a number array" }, { status: 400 });
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

  const skill = await Skill.findOne({ _id: topic.skillId, userId: session!.user.id }).lean().exec();
  if (!skill) {
    return NextResponse.json({ error: "Skill not found or unauthorized" }, { status: 404 });
  }

  const questions = await QuizQuestion.find({ subtopicId: id }).lean().exec();
  if (questions.length === 0) {
    return NextResponse.json(
      { error: "No quiz questions available yet" },
      { status: 409 },
    );
  }

  const answers = parsed.data.answers;
  if (answers.length !== questions.length) {
    return NextResponse.json(
      { error: `Expected ${questions.length} answers` },
      { status: 400 },
    );
  }

  const results = questions.map((q, index) => {
    const selectedIndex = answers[index] ?? -1;
    const correct = selectedIndex === q.correctAnswerIndex;
    return {
      questionId: q._id.toString(),
      selectedIndex,
      correctAnswerIndex: q.correctAnswerIndex,
      correct,
      explanation: q.explanation ?? null,
    };
  });

  const correctCount = results.filter((r) => r.correct).length;
  const total = questions.length;
  const percent = total === 0 ? 0 : correctCount / total;
  const passed = percent >= PASS_THRESHOLD;
  const score = Math.round(percent * 100);

  await QuizAttempt.create({
    subtopicId: id,
    answers,
    score,
    passed,
  });

  const recentFails = await QuizAttempt.find({ subtopicId: id })
    .sort({ attemptedAt: -1 })
    .limit(2)
    .lean()
    .exec();

  const consecutiveFails =
    recentFails[0] && !recentFails[0].passed
      ? recentFails[1] && !recentFails[1].passed
        ? 2
        : 1
      : 0;

  let simplifiedExplanation: string | null = null;
  const content = await Content.findOne({ subtopicId: id }).lean().exec();
  simplifiedExplanation = content?.simplifiedExplanation ?? null;

  if (!passed && consecutiveFails >= 2 && !simplifiedExplanation) {
    simplifiedExplanation = await ensureSimplifiedExplanation(id);
  } else if (!simplifiedExplanation && content?.simplifiedExplanation) {
    simplifiedExplanation = content.simplifiedExplanation;
  }

  // Refresh after possible write
  if (!simplifiedExplanation) {
    const refreshed = await Content.findOne({ subtopicId: id })
      .select("simplifiedExplanation")
      .lean()
      .exec();
    simplifiedExplanation = refreshed?.simplifiedExplanation ?? null;
  }

  let progressStatus: "in-progress" | "completed" = "in-progress";
  const progress = await Progress.findOne({
    skillId: topic.skillId,
    subtopicId: id,
  }).exec();

  if (passed) {
    progressStatus = "completed";
    if (progress) {
      progress.status = "completed";
      progress.lastVisitedAt = new Date();
      await progress.save();
    } else {
      await Progress.create({
        skillId: topic.skillId,
        topicId: topic._id,
        subtopicId: id,
        status: "completed",
        lastVisitedAt: new Date(),
      });
    }
  } else if (progress) {
    progress.status =
      progress.status === "completed" ? "completed" : "in-progress";
    progress.lastVisitedAt = new Date();
    await progress.save();
    progressStatus =
      progress.status === "completed" ? "completed" : "in-progress";
  }

  const body: QuizSubmitResponse = {
    score,
    percent,
    passed,
    correctCount,
    total,
    results,
    consecutiveFails,
    simplifiedExplanation,
    progressStatus,
  };

  return NextResponse.json(body);
}
