import { Types } from "mongoose";
import { NextResponse } from "next/server";

import { requireSession, withDb } from "@/lib/api";
import type {
  DashboardContinueTarget,
  DashboardResponse,
  DashboardSkill,
} from "@/lib/dashboard/types";
import { GenerationQueue } from "@/models/GenerationQueue";
import { Progress } from "@/models/Progress";
import { Skill } from "@/models/Skill";
import { Subtopic } from "@/models/Subtopic";
import { Topic } from "@/models/Topic";

export const dynamic = "force-dynamic";

export type {
  DashboardContinueTarget,
  DashboardResponse,
  DashboardSkill,
} from "@/lib/dashboard/types";

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function startOfUtcDay(date = new Date()): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

/** Consecutive-day streak from Progress.lastVisitedAt (UTC days). */
function computeStreak(activityDays: Set<string>): number {
  if (activityDays.size === 0) return 0;

  const today = startOfUtcDay();
  const todayKey = toDateKey(today);
  const yesterdayKey = toDateKey(addDays(today, -1));

  let cursor = today;
  if (!activityDays.has(todayKey)) {
    if (!activityDays.has(yesterdayKey)) return 0;
    cursor = addDays(today, -1);
  }

  let streak = 0;
  while (activityDays.has(toDateKey(cursor))) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

function last7DayFlags(activityDays: Set<string>): boolean[] {
  const today = startOfUtcDay();
  // Oldest → newest (left→right / bottom→top in UI)
  return Array.from({ length: 7 }, (_, index) => {
    const day = addDays(today, index - 6);
    return activityDays.has(toDateKey(day));
  });
}

function greetingForHour(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function displayNameFromEmail(email?: string | null): string {
  if (!email) return "there";
  const local = email.split("@")[0] ?? "there";
  const cleaned = local.replace(/[._-]+/g, " ").trim();
  if (!cleaned) return "there";
  return cleaned
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

async function skillSubtopicStats(skillId: Types.ObjectId): Promise<{
  totalSubtopics: number;
  completedSubtopics: number;
  percentComplete: number;
}> {
  const topics = await Topic.find({ skillId }).select("_id").lean().exec();
  const topicIds = topics.map((t) => t._id);
  if (topicIds.length === 0) {
    return { totalSubtopics: 0, completedSubtopics: 0, percentComplete: 0 };
  }

  const subtopics = await Subtopic.find({ topicId: { $in: topicIds } })
    .select("_id")
    .lean()
    .exec();
  const totalSubtopics = subtopics.length;
  if (totalSubtopics === 0) {
    return { totalSubtopics: 0, completedSubtopics: 0, percentComplete: 0 };
  }

  const subtopicIds = subtopics.map((s) => s._id);
  const completedSubtopics = await Progress.countDocuments({
    skillId,
    subtopicId: { $in: subtopicIds },
    status: "completed",
  }).exec();

  const percentComplete = Math.round(
    (completedSubtopics / totalSubtopics) * 100,
  );

  return { totalSubtopics, completedSubtopics, percentComplete };
}

export async function GET() {
  const { session, error } = await requireSession();
  if (error) return error;

  await withDb();

  const progressRows = await Progress.find({
    lastVisitedAt: { $exists: true, $ne: null },
  })
    .select("lastVisitedAt status subtopicId skillId topicId")
    .lean()
    .exec();

  const activityDays = new Set<string>();
  for (const row of progressRows) {
    if (row.lastVisitedAt) {
      activityDays.add(toDateKey(new Date(row.lastVisitedAt)));
    }
  }

  const streakDays = computeStreak(activityDays);
  const last7Days = last7DayFlags(activityDays);

  const continueProgress = await Progress.findOne({
    status: "in-progress",
    subtopicId: { $exists: true, $ne: null },
  })
    .sort({ lastVisitedAt: -1 })
    .lean()
    .exec();

  let continueTarget: DashboardContinueTarget | null = null;

  if (continueProgress?.subtopicId) {
    const subtopic = await Subtopic.findById(continueProgress.subtopicId)
      .lean()
      .exec();
    const topic = subtopic
      ? await Topic.findById(subtopic.topicId).lean().exec()
      : null;
    const skill = topic
      ? await Skill.findById(topic.skillId).lean().exec()
      : await Skill.findById(continueProgress.skillId).lean().exec();

    if (subtopic && topic && skill) {
      const stats = await skillSubtopicStats(skill._id);
      continueTarget = {
        subtopicId: subtopic._id.toString(),
        subtopicTitle: subtopic.title,
        topicId: topic._id.toString(),
        topicTitle: topic.title,
        skillId: skill._id.toString(),
        skillName: skill.name,
        percentComplete: stats.percentComplete,
        completedSubtopics: stats.completedSubtopics,
        totalSubtopics: stats.totalSubtopics,
      };
    }
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentDone = await GenerationQueue.find({
    status: "done",
    completedAt: { $gte: since },
    skillId: { $exists: true, $ne: null },
  })
    .select("skillId")
    .lean()
    .exec();

  const newSkillIds = new Set(
    recentDone
      .map((row) => row.skillId?.toString())
      .filter((id): id is string => Boolean(id)),
  );

  const activeSkills = await Skill.find({ status: "active" })
    .sort({ createdAt: -1 })
    .lean()
    .exec();

  const skills: DashboardSkill[] = [];
  for (const skill of activeSkills) {
    const stats = await skillSubtopicStats(skill._id);
    skills.push({
      id: skill._id.toString(),
      name: skill.name,
      description: skill.description ?? null,
      percentComplete: stats.percentComplete,
      completedSubtopics: stats.completedSubtopics,
      totalSubtopics: stats.totalSubtopics,
      isNew: newSkillIds.has(skill._id.toString()),
    });
  }

  const now = new Date();
  const dateLabel = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
  const name = displayNameFromEmail(session!.user.email);
  const hello = greetingForHour(now.getHours());

  const body: DashboardResponse = {
    greeting: {
      dateLabel,
      hello,
      name,
    },
    streak: {
      days: streakDays,
      last7Days,
    },
    continue: continueTarget,
    skills,
  };

  return NextResponse.json(body);
}
