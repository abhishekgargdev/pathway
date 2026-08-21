import { NextResponse } from "next/server";

import { requireSession, withDb } from "@/lib/api";
import { readGeminiApiKey } from "@/lib/gemini/client";
import { AiUsageLog } from "@/models/AiUsageLog";
import { CodingChallenge } from "@/models/CodingChallenge";
import { GenerationQueue } from "@/models/GenerationQueue";
import { Subtopic } from "@/models/Subtopic";
import { Topic } from "@/models/Topic";

export const dynamic = "force-dynamic";

export async function GET() {
  const { error } = await requireSession();
  if (error) return error;

  await withDb();

  // 1. Fetch queue items populated with Skill name, sorted by priority (desc) and createdAt (desc)
  const items = await GenerationQueue.find()
    .populate("skillId", "name")
    .sort({ priority: -1, createdAt: -1 })
    .lean()
    .exec();

  // 2. Resolve target names in memory for readability
  const subtopicIds = items
    .filter((i) => i.targetType === "subtopic-content" || i.targetType === "quiz")
    .map((i) => i.targetId)
    .filter(Boolean);

  const topicIds = items
    .filter((i) => i.targetType === "topic-outline")
    .map((i) => i.targetId)
    .filter(Boolean);

  const challengeIds = items
    .filter((i) => i.targetType === "coding-challenge")
    .map((i) => i.targetId)
    .filter(Boolean);

  const [subtopics, topics, challenges] = await Promise.all([
    Subtopic.find({ _id: { $in: subtopicIds } }).select("title").lean().exec(),
    Topic.find({ _id: { $in: topicIds } }).select("title").lean().exec(),
    CodingChallenge.find({ _id: { $in: challengeIds } }).select("prompt").lean().exec(),
  ]);

  const titlesMap: Record<string, string> = {};
  subtopics.forEach((s) => {
    titlesMap[String(s._id)] = s.title;
  });
  topics.forEach((t) => {
    titlesMap[String(t._id)] = t.title;
  });
  challenges.forEach((c) => {
    titlesMap[String(c._id)] =
      c.prompt.length > 65 ? `${c.prompt.slice(0, 65)}...` : c.prompt;
  });

  const enrichedQueue = items.map((item) => ({
    ...item,
    id: String(item._id),
    targetName: item.targetId
      ? (titlesMap[String(item.targetId)] ?? `ID: ${String(item.targetId)}`)
      : "N/A",
  }));

  // 3. Fetch today's Gemini usage logs
  const today = new Date().toISOString().slice(0, 10);
  const usageLogs = await AiUsageLog.find({ date: today }).lean().exec();

  const rawLimit = process.env.GEMINI_DAILY_LIMIT_PER_KEY;
  const limit = rawLimit ? Number(rawLimit) : 100;

  const usage = [];
  for (let keyIndex = 1; keyIndex <= 6; keyIndex++) {
    const isConfigured = !!readGeminiApiKey(keyIndex);
    const log = usageLogs.find((l) => l.keyIndex === keyIndex);
    const used = log?.callsUsed ?? 0;
    const tokens = log?.tokensUsed ?? 0;
    const remaining = Math.max(0, limit - used);

    usage.push({
      keyIndex,
      configured: isConfigured,
      callsUsed: used,
      tokensUsed: tokens,
      limit,
      remaining,
    });
  }

  return NextResponse.json({
    queue: enrichedQueue,
    usage,
  });
}
