import { NextResponse } from "next/server";
import { z } from "zod";

import { requireSession, withDb } from "@/lib/api";
import {
  AllKeysExhaustedError,
  GeminiValidationError,
  generateSkillOutline,
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
  name: z.string().trim().min(1, "Skill name is required").max(100, "Skill name cannot exceed 100 characters"),
});

/** GET /api/skills — Returns the authenticated user's skills with progress & status */
export async function GET() {
  const { session, error } = await requireSession();
  if (error) return error;

  await withDb();

  // 1. Fetch user's skills sorted by creation date
  const skills = await Skill.find({ userId: session!.user.id })
    .sort({ createdAt: -1 })
    .lean()
    .exec();

  const skillIds = skills.map((s) => s._id);

  // 2. Fetch all topics, progress rows, and queue items for these skills
  const [topics, progressRows, queueItems] = await Promise.all([
    Topic.find({ skillId: { $in: skillIds } }).sort({ order: 1 }).lean().exec(),
    Progress.find({ skillId: { $in: skillIds } }).lean().exec(),
    GenerationQueue.find({ skillId: { $in: skillIds } }).lean().exec(),
  ]);

  const topicIds = topics.map((t) => t._id);
  const subtopics = topicIds.length
    ? await Subtopic.find({ topicId: { $in: topicIds } }).sort({ order: 1 }).lean().exec()
    : [];

  // Group topics by skill
  const topicsBySkill = new Map<string, typeof topics>();
  for (const topic of topics) {
    const sId = topic.skillId.toString();
    const list = topicsBySkill.get(sId) ?? [];
    list.push(topic);
    topicsBySkill.set(sId, list);
  }

  // Group subtopics by topic
  const subtopicsByTopic = new Map<string, typeof subtopics>();
  for (const sub of subtopics) {
    const tId = sub.topicId.toString();
    const list = subtopicsByTopic.get(tId) ?? [];
    list.push(sub);
    subtopicsByTopic.set(tId, list);
  }

  // Group progress by skill & subtopic ID
  const progressMap = new Map<string, typeof progressRows[number]>();
  for (const row of progressRows) {
    if (row.subtopicId) {
      progressMap.set(`${row.skillId.toString()}-${row.subtopicId.toString()}`, row);
    }
  }

  // Group queue items by skill
  const queueBySkill = new Map<string, typeof queueItems>();
  for (const qi of queueItems) {
    if (qi.skillId) {
      const sId = qi.skillId.toString();
      const list = queueBySkill.get(sId) ?? [];
      list.push(qi);
      queueBySkill.set(sId, list);
    }
  }

  const results = [];

  for (const skill of skills) {
    const sId = skill._id.toString();

    // Flatten subtopics in path order for this skill
    const skillTopics = topicsBySkill.get(sId) ?? [];
    const skillSubtopics: typeof subtopics = [];
    for (const topic of skillTopics) {
      const topicSubs = subtopicsByTopic.get(topic._id.toString()) ?? [];
      skillSubtopics.push(...topicSubs);
    }

    let completedSubtopics = 0;
    const totalSubtopics = skillSubtopics.length;
    let currentSubtopic = null;
    let lastActivityAt: Date | null = null;
    let foundContinue = false;

    for (let i = 0; i < totalSubtopics; i++) {
      const sub = skillSubtopics[i]!;
      const prog = progressMap.get(`${sId}-${sub._id.toString()}`);

      if (prog) {
        if (prog.status === "completed") {
          completedSubtopics++;
        }
        if (prog.lastVisitedAt) {
          const visited = new Date(prog.lastVisitedAt);
          if (!lastActivityAt || visited > lastActivityAt) {
            lastActivityAt = visited;
          }
        }
      }

      if (!foundContinue) {
        // Continue learning target: first subtopic not completed
        if (!prog || prog.status !== "completed") {
          currentSubtopic = {
            id: sub._id.toString(),
            title: sub.title,
            topicId: sub.topicId.toString(),
          };
          foundContinue = true;
        }
      }
    }

    // Fallback: if all completed, point to the last subtopic
    if (!foundContinue && totalSubtopics > 0) {
      const lastSub = skillSubtopics[totalSubtopics - 1]!;
      currentSubtopic = {
        id: lastSub._id.toString(),
        title: lastSub.title,
        topicId: lastSub.topicId.toString(),
      };
    }

    const percentComplete = totalSubtopics === 0 ? 0 : Math.round((completedSubtopics / totalSubtopics) * 100);

    // Calculate generationStatus
    const skillQueue = queueBySkill.get(sId) ?? [];
    let generationStatus: "generating" | "ready" | "failed" = "ready";
    if (skillQueue.length > 0) {
      const hasActive = skillQueue.some(item => item.status === "queued" || item.status === "processing");
      const hasFailed = skillQueue.some(item => item.status === "failed");
      if (hasActive) {
        generationStatus = "generating";
      } else if (hasFailed) {
        generationStatus = "failed";
      }
    }

    results.push({
      id: sId,
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
      lastActivityAt: lastActivityAt ? lastActivityAt.toISOString() : null,
    });
  }

  return NextResponse.json({ skills: results });
}

/** POST /api/skills — Create a new skill and generate its topic/subtopic outline */
export async function POST(request: Request) {
  const { session, error } = await requireSession();
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

  const name = parsed.data.name;

  await withDb();

  // Normalize name whitespace and check for duplicates under the same user
  const normalizedInput = name.trim().replace(/\s+/g, " ").toLowerCase();
  const existingSkills = await Skill.find({ userId: session!.user.id, status: "active" }).lean().exec();
  const isDuplicate = existingSkills.some(
    (s) => s.name.trim().replace(/\s+/g, " ").toLowerCase() === normalizedInput
  );

  if (isDuplicate) {
    return NextResponse.json(
      { error: "You already have an active learning path for this skill." },
      { status: 400 },
    );
  }

  let outlineResult;
  try {
    outlineResult = await generateSkillOutline(name);
  } catch (err) {
    if (err instanceof AllKeysExhaustedError) {
      return NextResponse.json(
        {
          error:
            "AI quota is exhausted for today. Try again tomorrow’s batch, or wait for lazy generation headroom.",
          code: "ALL_KEYS_EXHAUSTED",
        },
        { status: 503 },
      );
    }
    if (err instanceof GeminiValidationError) {
      return NextResponse.json(
        { error: "Outline generation returned invalid data. Please try again." },
        { status: 502 },
      );
    }
    const message = err instanceof Error ? err.message : "Outline generation failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const outline = outlineResult.data;

  const skill = await Skill.create({
    userId: session!.user.id,
    name,
    description: outline.description,
    status: "active",
    source: "user-added",
  });

  const outlineTopics: CreateSkillResponse["outline"]["topics"] = [];
  const queueItems: Array<{
    targetType: "topic-outline" | "subtopic-content" | "quiz";
    targetId: string;
    skillId: string;
    priority: number;
  }> = [];

  for (const topicInput of outline.topics) {
    const topic = await Topic.create({
      skillId: skill._id,
      title: topicInput.title,
      order: topicInput.order,
      status: "pending",
    });

    const subtopicPayload: CreateSkillResponse["outline"]["topics"][number]["subtopics"] =
      [];

    for (const subInput of topicInput.subtopics) {
      const subtopic = await Subtopic.create({
        topicId: topic._id,
        title: subInput.title,
        order: subInput.order,
        status: "pending",
      });

      subtopicPayload.push({
        id: subtopic._id.toString(),
        title: subtopic.title,
        order: subtopic.order,
      });

      // Earlier path nodes get higher priority for cron drain.
      const base = 1000 - (topicInput.order * 20 + subInput.order);
      queueItems.push({
        targetType: "subtopic-content",
        targetId: subtopic._id.toString(),
        skillId: skill._id.toString(),
        priority: base,
      });
      queueItems.push({
        targetType: "quiz",
        targetId: subtopic._id.toString(),
        skillId: skill._id.toString(),
        priority: base - 5,
      });
    }

    queueItems.push({
      targetType: "topic-outline",
      targetId: topic._id.toString(),
      skillId: skill._id.toString(),
      priority: 100 - topicInput.order,
    });

    outlineTopics.push({
      id: topic._id.toString(),
      title: topic.title,
      order: topic.order,
      subtopics: subtopicPayload,
    });
  }

  const enqueued = await enqueueGenerationMany(queueItems);

  const body: CreateSkillResponse = {
    skill: {
      id: skill._id.toString(),
      name: skill.name,
      description: skill.description ?? outline.description,
      status: skill.status,
      source: skill.source,
    },
    outline: {
      description: outline.description,
      topics: outlineTopics,
    },
    enqueued,
  };

  return NextResponse.json(body, { status: 201 });
}
