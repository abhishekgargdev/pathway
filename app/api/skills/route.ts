import { NextResponse } from "next/server";
import { z } from "zod";

import { requireSession, withDb } from "@/lib/api";
import {
  AllKeysExhaustedError,
  GeminiValidationError,
  generateSkillOutline,
  orderSkills,
} from "@/lib/gemini/client";
import { enqueueGenerationMany } from "@/lib/queue/enqueue";
import type { CreateSkillResponse } from "@/lib/skills/types";
import { Skill } from "@/models/Skill";
import { Subtopic } from "@/models/Subtopic";
import { Topic } from "@/models/Topic";
import { Progress } from "@/models/Progress";
import { GenerationQueue } from "@/models/GenerationQueue";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export type { CreateSkillResponse } from "@/lib/skills/types";

const createSkillSchema = z.object({
  name: z.string().trim().min(1, "Skill name is required").max(10000),
});

export async function GET() {
  const { session, error } = await requireSession();
  if (error) return error;

  await withDb();

  const activeSkills = await Skill.find({ status: "active" })
    .sort({ createdAt: -1 })
    .lean()
    .exec();

  const skills = [];

  for (const skill of activeSkills) {
    const topics = await Topic.find({ skillId: skill._id }).select("_id").lean().exec();
    const topicIds = topics.map((t) => t._id);

    // Compute stats
    let totalSubtopics = 0;
    let completedSubtopics = 0;
    let percentComplete = 0;

    if (topicIds.length > 0) {
      const subtopics = await Subtopic.find({ topicId: { $in: topicIds } }).select("_id").lean().exec();
      totalSubtopics = subtopics.length;
      if (totalSubtopics > 0) {
        const subtopicIds = subtopics.map((s) => s._id);
        completedSubtopics = await Progress.countDocuments({
          skillId: skill._id,
          subtopicId: { $in: subtopicIds },
          status: "completed",
        }).exec();
        percentComplete = Math.round((completedSubtopics / totalSubtopics) * 100);
      }
    }

    // Determine generationStatus dynamically
    let generationStatus = skill.generationStatus || "ready";

    // If it says ready but has no topics, it might still be generating or failed
    if (generationStatus === "ready" && topics.length === 0) {
      const hasOutlineJobs = await GenerationQueue.findOne({
        skillId: skill._id,
        targetType: "skill-outline",
        status: { $in: ["queued", "processing"] },
      }).lean().exec();
      
      const hasFailedOutlineJobs = await GenerationQueue.findOne({
        skillId: skill._id,
        targetType: "skill-outline",
        status: "failed",
      }).lean().exec();

      if (hasOutlineJobs) {
        generationStatus = "generating";
      } else if (hasFailedOutlineJobs) {
        generationStatus = "failed";
      } else {
        generationStatus = "generating"; // default if empty topics
      }
    }

    // Find current subtopic (last visited or in-progress)
    const currentProgress = await Progress.findOne({
      skillId: skill._id,
      status: "in-progress",
    })
      .sort({ lastVisitedAt: -1 })
      .lean()
      .exec();

    let currentSubtopic = null;
    if (currentProgress?.subtopicId) {
      const sub = await Subtopic.findById(currentProgress.subtopicId).lean().exec();
      if (sub) {
        currentSubtopic = {
          id: sub._id.toString(),
          title: sub.title,
          topicId: sub.topicId.toString(),
        };
      }
    }

    skills.push({
      id: skill._id.toString(),
      name: skill.name,
      description: skill.description ?? null,
      status: skill.status,
      createdAt: skill.createdAt.toISOString(),
      generationStatus,
      progress: {
        completedSubtopics,
        totalSubtopics,
        percentComplete,
      },
      currentSubtopic,
      lastActivityAt: currentProgress?.lastVisitedAt?.toISOString() ?? null,
    });
  }

  return NextResponse.json({ skills });
}

export async function POST(request: Request) {
  const { error } = await requireSession();
  if (error) return error;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createSkillSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const nameInput = parsed.data.name;
  await withDb();

  // Split by comma or newline (handles pasted bullet/multiline lists)
  const parsedNames = nameInput
    .split(/[\r\n,]+/)
    .map((n) => n.trim())
    .filter((n) => n.length > 0);

  // Deduplicate case-insensitively while preserving original formatting
  const rawNames: string[] = [];
  const seen = new Set<string>();
  for (const name of parsedNames) {
    const key = name.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      rawNames.push(name.slice(0, 120));
    }
  }

  if (rawNames.length === 0) {
    return NextResponse.json({ error: "At least one skill name is required" }, { status: 400 });
  }

  // 1. Order skills using AI if there are multiple
  let orderedNames = rawNames;
  if (rawNames.length > 1) {
    try {
      const orderResult = await orderSkills(rawNames);
      orderedNames = orderResult.data.skills;
    } catch (err) {
      console.warn("AI ordering failed, falling back to original order:", err);
      orderedNames = rawNames;
    }
  }

  // 2. Create the skills and enqueue outline generation tasks
  const createdSkills = [];
  const queueItems = [];

  for (let i = 0; i < orderedNames.length; i++) {
    const sName = orderedNames[i]!;
    
    // Create the skill document in pending "generating" status
    const skill = await Skill.create({
      name: sName,
      description: `Learning path for ${sName} (generating outline...)`,
      status: "active",
      source: "user-added",
      generationStatus: "generating",
    });

    createdSkills.push(skill);

    // Enqueue "skill-outline" task. Foundational skills get higher priority so they generate first!
    const priority = 2000 - i * 10;
    queueItems.push({
      targetType: "skill-outline" as const,
      targetId: skill._id.toString(),
      skillId: skill._id.toString(),
      priority,
    });
  }

  const enqueued = await enqueueGenerationMany(queueItems);

  // Return the first created skill metadata to match frontend expectations,
  // or a list if they need it. The frontend expects:
  // { skill: { id, name, description, status, source }, outline: { description, topics: [] }, enqueued }
  const primarySkill = createdSkills[0]!;
  
  const body: CreateSkillResponse = {
    skill: {
      id: primarySkill._id.toString(),
      name: primarySkill.name,
      description: primarySkill.description ?? "",
      status: primarySkill.status,
      source: primarySkill.source,
    },
    outline: {
      description: primarySkill.description || "",
      topics: [], // Topics are generated asynchronously in the background
    },
    enqueued,
  };

  return NextResponse.json(body, { status: 201 });
}
