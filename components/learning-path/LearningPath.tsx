"use client";

import type { SkillTreeTopic } from "@/lib/skills/tree-types";
import { TopicSection } from "./TopicSection";

type LearningPathProps = {
  topics: SkillTreeTopic[];
  onRefresh?: () => void;
};

export function LearningPath({ topics, onRefresh }: LearningPathProps) {
  return (
    <div className="flex flex-col gap-6">
      {topics.map((topic, index) => (
        <TopicSection
          key={topic.id}
          topic={topic}
          index={index}
          onRefresh={onRefresh}
        />
      ))}
    </div>
  );
}
