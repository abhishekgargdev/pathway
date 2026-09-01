import { Types } from "mongoose";
import { NextResponse } from "next/server";

import { requireSession, withDb } from "@/lib/api";
import { GenerationQueue } from "@/models/GenerationQueue";
import { Skill } from "@/models/Skill";

export const dynamic = "force-dynamic";

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

  // Reset all failed queue items for this skill back to queued with 0 attempts
  const res = await GenerationQueue.updateMany(
    { skillId: sId, status: "failed" },
    { $set: { status: "queued", attempts: 0 }, $unset: { lastError: 1 } },
  ).exec();

  if (skill.generationStatus === "failed") {
    await Skill.updateOne(
      { _id: sId },
      { $set: { generationStatus: "generating" } },
    ).exec();
  }

  return NextResponse.json({
    success: true,
    resetCount: res.modifiedCount,
    message: `Reset ${res.modifiedCount} failed generation tasks to queued.`,
  });
}
