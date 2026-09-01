import { Types } from "mongoose";
import { NextResponse } from "next/server";

import { requireSession, withDb } from "@/lib/api";
import type {
  SkillTreeNodeState,
  SkillTreeResponse,
  SkillTreeSubtopic,
  SkillTreeTopic,
} from "@/lib/skills/tree-types";
import { CodingChallenge } from "@/models/CodingChallenge";
import { Progress } from "@/models/Progress";
import { Skill } from "@/models/Skill";
import { Subtopic } from "@/models/Subtopic";
import { Topic } from "@/models/Topic";

export const dynamic = "force-dynamic";

export type { SkillTreeResponse } from "@/lib/skills/tree-types";

type RouteContext = {
  params: Promise<{ skillId: string }>;
};

function resolveNodeState(params: {
  unlocked: boolean;
  progressStatus: "not-started" | "in-progress" | "completed" | null;
}): SkillTreeNodeState {
  const { unlocked, progressStatus } = params;

  if (progressStatus === "completed") return "completed";
  if (progressStatus === "in-progress") return "in-progress";
  if (!unlocked) return "locked";
  return "available";
}

export async function GET(_request: Request, context: RouteContext) {
  const { error } = await requireSession();
  if (error) return error;

  const { skillId } = await context.params;
  if (!Types.ObjectId.isValid(skillId)) {
    return NextResponse.json({ error: "Invalid skill id" }, { status: 400 });
  }

  await withDb();

  const skill = await Skill.findById(skillId).lean().exec();
  if (!skill) {
    return NextResponse.json({ error: "Skill not found" }, { status: 404 });
  }

  const topics = await Topic.find({ skillId: skill._id })
    .sort({ order: 1 })
    .lean()
    .exec();

  const topicIds = topics.map((t) => t._id);
  const subtopics = topicIds.length
    ? await Subtopic.find({ topicId: { $in: topicIds } })
        .sort({ order: 1 })
        .lean()
        .exec()
    : [];

  const progressRows = await Progress.find({
    skillId: skill._id,
    subtopicId: { $exists: true, $ne: null },
  })
    .lean()
    .exec();

  const progressBySubtopic = new Map<
    string,
    "not-started" | "in-progress" | "completed"
  >();
  for (const row of progressRows) {
    if (!row.subtopicId) continue;
    progressBySubtopic.set(row.subtopicId.toString(), row.status);
  }

  const subtopicsByTopic = new Map<string, typeof subtopics>();
  for (const sub of subtopics) {
    const key = sub.topicId.toString();
    const list = subtopicsByTopic.get(key) ?? [];
    list.push(sub);
    subtopicsByTopic.set(key, list);
  }

  // Flatten in path order for unlock chain: topic.order → subtopic.order
  const orderedFlat: Array<{
    topic: (typeof topics)[number];
    subtopic: (typeof subtopics)[number];
  }> = [];
  for (const topic of topics) {
    const list = subtopicsByTopic.get(topic._id.toString()) ?? [];
    for (const subtopic of list) {
      orderedFlat.push({ topic, subtopic });
    }
  }

  let previousCompleted = true; // first node is unlocked
  let completedSubtopics = 0;

  const flatStates: SkillTreeNodeState[] = [];
  for (const { subtopic } of orderedFlat) {
    const progressStatus = progressBySubtopic.get(subtopic._id.toString()) ?? null;
    const unlocked = previousCompleted;
    const nodeState = resolveNodeState({ unlocked, progressStatus });
    flatStates.push(nodeState);
    if (nodeState === "completed") {
      completedSubtopics += 1;
      previousCompleted = true;
    } else {
      previousCompleted = false;
    }
  }

  const totalSubtopics = orderedFlat.length;
  const percentComplete =
    totalSubtopics === 0
      ? 0
      : Math.round((completedSubtopics / totalSubtopics) * 100);

  const path: SkillTreeResponse["path"] = orderedFlat.map((item, index) => {
    const nodeState = flatStates[index]!;
    const progressStatus =
      progressBySubtopic.get(item.subtopic._id.toString()) ?? null;

    return {
      id: item.subtopic._id.toString(),
      label: item.subtopic.title,
      subtitle: item.topic.title,
      state: nodeState,
      href:
        nodeState === "locked" ? null : `/subtopics/${item.subtopic._id.toString()}`,
      topicId: item.topic._id.toString(),
    };
  });

  const treeTopics: SkillTreeTopic[] = topics.map((topic) => {
    const list = subtopicsByTopic.get(topic._id.toString()) ?? [];
    const nested: SkillTreeSubtopic[] = list.map((subtopic) => {
      const pathItem = path.find((p) => p.id === subtopic._id.toString());
      const progressStatus =
        progressBySubtopic.get(subtopic._id.toString()) ?? null;
      const nodeState = pathItem?.state ?? "locked";

      return {
        id: subtopic._id.toString(),
        title: subtopic.title,
        order: subtopic.order,
        status: subtopic.status,
        progressStatus,
        nodeState,
        href: pathItem?.href ?? null,
      };
    });

    return {
      id: topic._id.toString(),
      title: topic.title,
      order: topic.order,
      status: topic.status,
      subtopics: nested,
    };
  });

  const challengesDocs = await CodingChallenge.find({ skillId: skill._id })
    .sort({ createdAt: 1 })
    .lean()
    .exec();

  const topicTitleById = new Map(
    topics.map((t) => [t._id.toString(), t.title] as const),
  );

  const challenges: SkillTreeResponse["challenges"] = challengesDocs.map(
    (ch) => {
      const topicId = ch.topicId?.toString() ?? null;
      return {
        id: ch._id.toString(),
        topicId,
        topicTitle: topicId ? (topicTitleById.get(topicId) ?? null) : null,
        difficulty: ch.difficulty ?? null,
        status: ch.status,
        href:
          ch.status === "ready"
            ? `/challenges/${ch._id.toString()}`
            : `/challenges/${ch._id.toString()}`,
      };
    },
  );

  const body: SkillTreeResponse = {
    skill: {
      id: skill._id.toString(),
      name: skill.name,
      description: skill.description ?? null,
      generationStatus: skill.generationStatus || "ready",
    },
    stats: {
      completedSubtopics,
      totalSubtopics,
      percentComplete,
    },
    topics: treeTopics,
    path,
    challenges,
  };

  return NextResponse.json(body);
}
