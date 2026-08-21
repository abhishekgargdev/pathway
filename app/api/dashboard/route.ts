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

  const activeSkills = await Skill.find({ userId: session!.user.id, status: "active" })
    .sort({ createdAt: -1 })
    .lean()
    .exec();

  const userSkillIds = activeSkills.map((s) => s._id);

  const progressRows = userSkillIds.length > 0
    ? await Progress.find({
        skillId: { $in: userSkillIds },
        lastVisitedAt: { $exists: true, $ne: null },
      })
        .select("lastVisitedAt status subtopicId skillId topicId")
        .lean()
        .exec()
    : [];

  const activityDays = new Set<string>();
  for (const row of progressRows) {
    if (row.lastVisitedAt) {
      activityDays.add(toDateKey(new Date(row.lastVisitedAt)));
    }
  }

  const streakDays = computeStreak(activityDays);
  const last7Days = last7DayFlags(activityDays);

  // Priority 1: current in-progress subtopic
  const inProgress = userSkillIds.length > 0
    ? await Progress.findOne({
        skillId: { $in: userSkillIds },
        status: "in-progress",
        subtopicId: { $exists: true, $ne: null },
      })
        .sort({ lastVisitedAt: -1 })
        .lean()
        .exec()
    : null;

  let continueSubtopicId: Types.ObjectId | null = null;
  let continueSkillId: Types.ObjectId | null = null;

  if (inProgress?.subtopicId) {
    continueSubtopicId = inProgress.subtopicId;
    continueSkillId = inProgress.skillId;
  } else {
    // Priority 2: first available incomplete subtopic
    for (const skill of activeSkills) {
      const topics = await Topic.find({ skillId: skill._id }).sort({ order: 1 }).select("_id").lean().exec();
      const topicIds = topics.map((t) => t._id);
      if (topicIds.length === 0) continue;

      const subtopics = await Subtopic.find({ topicId: { $in: topicIds } })
        .sort({ order: 1 })
        .lean()
        .exec();
      
      const topicOrderMap = new Map(topics.map((t, idx) => [t._id.toString(), idx]));
      subtopics.sort((a, b) => {
        const orderA = topicOrderMap.get(a.topicId.toString()) ?? 0;
        const orderB = topicOrderMap.get(b.topicId.toString()) ?? 0;
        if (orderA !== orderB) return orderA - orderB;
        return a.order - b.order;
      });

      const completedSubtopicIds = new Set(
        (
          await Progress.find({
            skillId: skill._id,
            status: "completed",
            subtopicId: { $exists: true, $ne: null },
          })
            .select("subtopicId")
            .lean()
            .exec()
        ).map((p) => p.subtopicId!.toString())
      );

      const incomplete = subtopics.find((s) => !completedSubtopicIds.has(s._id.toString()));
      if (incomplete) {
        continueSubtopicId = incomplete._id;
        continueSkillId = skill._id;
        break;
      }
    }
  }

  let continueTarget: DashboardContinueTarget | null = null;

  if (continueSubtopicId && continueSkillId) {
    const subtopic = await Subtopic.findById(continueSubtopicId).lean().exec();
    const topic = subtopic ? await Topic.findById(subtopic.topicId).lean().exec() : null;
    const skill = await Skill.findById(continueSkillId).lean().exec();

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
  const recentDone = userSkillIds.length > 0
    ? await GenerationQueue.find({
        skillId: { $in: userSkillIds },
        status: "done",
        completedAt: { $gte: since },
      })
        .select("skillId")
        .lean()
        .exec()
    : [];

  const newSkillIds = new Set(
    recentDone
      .map((row) => row.skillId?.toString())
      .filter((id): id is string => Boolean(id)),
  );

  async function getSkillOutlineStatus(skillId: Types.ObjectId): Promise<"pending" | "generating" | "ready" | "failed"> {
    const queueItem = await GenerationQueue.findOne({
      skillId,
      targetType: "topic-outline",
    }).lean().exec();

    if (queueItem) {
      if (queueItem.status === "failed") return "failed";
      if (queueItem.status === "processing") return "generating";
      if (queueItem.status === "queued") return "generating";
    }

    const topics = await Topic.find({ skillId }).lean().exec();
    if (topics.length === 0) return "pending";

    const hasGenerating = topics.some((t) => t.status === "generating" || t.status === "pending");
    if (hasGenerating) return "generating";

    return "ready";
  }

  async function getSkillCurrentSubtopic(skillId: Types.ObjectId): Promise<string | null> {
    const topics = await Topic.find({ skillId }).sort({ order: 1 }).select("_id").lean().exec();
    const topicIds = topics.map((t) => t._id);
    if (topicIds.length === 0) return null;

    const subtopics = await Subtopic.find({ topicId: { $in: topicIds } })
      .sort({ order: 1 })
      .lean()
      .exec();
    
    if (subtopics.length === 0) return null;

    const topicOrderMap = new Map(topics.map((t, idx) => [t._id.toString(), idx]));
    subtopics.sort((a, b) => {
      const orderA = topicOrderMap.get(a.topicId.toString()) ?? 0;
      const orderB = topicOrderMap.get(b.topicId.toString()) ?? 0;
      if (orderA !== orderB) return orderA - orderB;
      return a.order - b.order;
    });

    const progressRows = await Progress.find({
      skillId,
      subtopicId: { $in: subtopics.map((s) => s._id) },
    }).select("subtopicId status").lean().exec();

    const progressMap = new Map(
      progressRows.map((p) => [p.subtopicId!.toString(), p.status])
    );

    const inProgressSub = subtopics.find((s) => progressMap.get(s._id.toString()) === "in-progress");
    if (inProgressSub) return inProgressSub.title;

    const incompleteSub = subtopics.find((s) => progressMap.get(s._id.toString()) !== "completed");
    if (incompleteSub) return incompleteSub.title;

    return "Completed!";
  }

  const skills: DashboardSkill[] = [];
  for (const skill of activeSkills) {
    const stats = await skillSubtopicStats(skill._id);
    const status = await getSkillOutlineStatus(skill._id);
    const currentSubtopic = await getSkillCurrentSubtopic(skill._id);
    skills.push({
      id: skill._id.toString(),
      name: skill.name,
      description: skill.description ?? null,
      percentComplete: stats.percentComplete,
      completedSubtopics: stats.completedSubtopics,
      totalSubtopics: stats.totalSubtopics,
      isNew: newSkillIds.has(skill._id.toString()),
      status,
      currentSubtopic,
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
