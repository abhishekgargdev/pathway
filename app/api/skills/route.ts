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

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export type { CreateSkillResponse } from "@/lib/skills/types";

const createSkillSchema = z.object({
  name: z.string().trim().min(1, "Skill name is required").max(120),
});

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

  const name = parsed.data.name;

  await withDb();

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
