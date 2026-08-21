export type SkillTreeNodeState =
  | "locked"
  | "available"
  | "in-progress"
  | "completed";

export type SkillTreeSubtopic = {
  id: string;
  title: string;
  order: number;
  status: "pending" | "generating" | "ready";
  progressStatus: "not-started" | "in-progress" | "completed" | null;
  nodeState: SkillTreeNodeState;
  href: string | null;
};

export type SkillTreeTopic = {
  id: string;
  title: string;
  order: number;
  status: "pending" | "generating" | "ready";
  subtopics: SkillTreeSubtopic[];
};

export type SkillTreeResponse = {
  skill: {
    id: string;
    name: string;
    description: string | null;
  };
  stats: {
    completedSubtopics: number;
    totalSubtopics: number;
    percentComplete: number;
  };
  topics: SkillTreeTopic[];
  /** Flattened subtopics in path order for the Learning Path component */
  path: Array<{
    id: string;
    label: string;
    subtitle: string;
    state: SkillTreeNodeState;
    href: string | null;
    topicId: string;
  }>;
  /** Topic-level coding challenges (when ready / available) */
  challenges: Array<{
    id: string;
    topicId: string | null;
    topicTitle: string | null;
    difficulty: "easy" | "medium" | "hard" | null;
    status: "pending" | "generating" | "ready";
    href: string | null;
  }>;
};
