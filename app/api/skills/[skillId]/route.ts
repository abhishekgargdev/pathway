import { Types } from "mongoose";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireSession, withDb } from "@/lib/api";
import { CodingChallenge } from "@/models/CodingChallenge";
import { Content } from "@/models/Content";
import { GenerationQueue } from "@/models/GenerationQueue";
import { Progress } from "@/models/Progress";
import { QuizQuestion } from "@/models/QuizQuestion";
import { Skill } from "@/models/Skill";
import { SolutionAnalysis } from "@/models/SolutionAnalysis";
import { Subtopic } from "@/models/Subtopic";
import { Topic } from "@/models/Topic";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ skillId: string }> };

const updateSkillSchema = z.object({
  name: z.string().trim().min(1, "Skill name is required").max(120).optional(),
  description: z.string().trim().max(2000).optional(),
});

export async function PATCH(request: Request, context: RouteContext) {
  const { error } = await requireSession();
  if (error) return error;

  const { skillId } = await context.params;
  if (!Types.ObjectId.isValid(skillId)) {
    return NextResponse.json({ error: "Invalid skill ID" }, { status: 400 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = updateSkillSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.description !== undefined) updates.description = parsed.data.description;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  await withDb();
  const id = new Types.ObjectId(skillId);

  const skill = await Skill.findByIdAndUpdate(
    id,
    { $set: updates },
    { new: true },
  ).lean().exec();

  if (!skill) {
    return NextResponse.json({ error: "Skill not found" }, { status: 404 });
  }

  return NextResponse.json({
    skill: {
      id: skill._id.toString(),
      name: skill.name,
      description: skill.description ?? "",
      status: skill.status,
      source: skill.source,
    },
  });
}

export async function DELETE(_request: Request, context: RouteContext) {
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

  // 1. Gather all topic IDs for this skill
  const topics = await Topic.find({ skillId: sId }).select("_id").lean().exec();
  const topicIds = topics.map((t) => t._id);

  // 2. Gather all subtopic IDs
  const subtopics = await Subtopic.find({ topicId: { $in: topicIds } }).select("_id").lean().exec();
  const subtopicIds = subtopics.map((s) => s._id);

  // 3. Gather all coding challenges for this skill
  const challenges = await CodingChallenge.find({ skillId: sId }).select("_id").lean().exec();
  const challengeIds = challenges.map((c) => c._id);

  // 4. Cascade delete associated documents
  await Promise.all([
    Content.deleteMany({ subtopicId: { $in: subtopicIds } }).exec(),
    QuizQuestion.deleteMany({ subtopicId: { $in: subtopicIds } }).exec(),
    Subtopic.deleteMany({ _id: { $in: subtopicIds } }).exec(),
    Topic.deleteMany({ _id: { $in: topicIds } }).exec(),
    SolutionAnalysis.deleteMany({ challengeId: { $in: challengeIds } }).exec(),
    CodingChallenge.deleteMany({ _id: { $in: challengeIds } }).exec(),
    Progress.deleteMany({ skillId: sId }).exec(),
    GenerationQueue.deleteMany({ skillId: sId }).exec(),
    Skill.deleteOne({ _id: sId }).exec(),
  ]);

  return NextResponse.json({
    success: true,
    message: `Skill "${skill.name}" and all associated learning materials were deleted.`,
  });
}
