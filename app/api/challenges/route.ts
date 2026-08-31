import { NextResponse } from "next/server";

import { requireSession, withDb } from "@/lib/api";
import { CodingChallenge } from "@/models/CodingChallenge";
import { Skill } from "@/models/Skill";
import { Submission } from "@/models/Submission";
import { Topic } from "@/models/Topic";

export const dynamic = "force-dynamic";

export async function GET() {
  const { error } = await requireSession();
  if (error) return error;

  await withDb();

  const challengesDocs = await CodingChallenge.find()
    .sort({ createdAt: -1 })
    .lean()
    .exec();

  const challenges = [];

  for (const ch of challengesDocs) {
    const skill = await Skill.findById(ch.skillId).select("name").lean().exec();
    const topic = ch.topicId
      ? await Topic.findById(ch.topicId).select("title").lean().exec()
      : null;

    const passing = await Submission.findOne({
      challengeId: ch._id,
      allPassed: true,
    })
      .select("_id")
      .lean()
      .exec();

    challenges.push({
      id: ch._id.toString(),
      skillId: ch.skillId.toString(),
      skillName: skill?.name ?? "Unknown Skill",
      topicTitle: topic?.title ?? "General",
      difficulty: ch.difficulty ?? "medium",
      status: ch.status,
      completed: Boolean(passing),
      createdAt: ch.createdAt?.toISOString(),
    });
  }

  return NextResponse.json({ challenges });
}
