"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

import { LearningPathNode } from "./LearningPathNode";
import type { SkillTreeTopic } from "@/lib/skills/tree-types";

type TopicSectionProps = {
  topic: SkillTreeTopic;
  index: number;
  onRefresh?: () => void;
};

export function TopicSection({ topic, index, onRefresh }: TopicSectionProps) {
  const { title, subtopics } = topic;
  
  // Calculate completion percentage for this specific topic
  const total = subtopics.length;
  const completed = subtopics.filter((sub) => sub.nodeState === "completed").length;
  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);

  // If a topic has more than 4 subtopics, collapse it by default
  const isLarge = total > 4;
  const [isCollapsed, setIsCollapsed] = useState(isLarge);

  return (
    <div className="rounded-2xl border border-[#2A2F4A] bg-[#171B2E] p-4 md:p-5 shadow-[0_4px_16px_rgba(0,0,0,0.2)]">
      {/* Topic Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="inline-flex rounded-md bg-[#5EEAD4]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.5px] text-[#5EEAD4]">
            Topic {index + 1}
          </span>
          <h3 className="mt-1 font-heading text-base font-bold tracking-tight text-[#EDEFF7] md:text-lg">
            {title}
          </h3>
          <p className="mt-0.5 text-xs text-[#8B93B0]">
            {completed} of {total} lessons completed · {percentage}%
          </p>
        </div>

        {/* Collapsible Action toggle button */}
        {isLarge && (
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-[#2A2F4A] bg-[#1F2440] text-[#EDEFF7] transition-colors hover:border-[#5EEAD4]/30 hover:text-[#5EEAD4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5EEAD4]/40"
            aria-label={isCollapsed ? "Expand topic lessons" : "Collapse topic lessons"}
          >
            {isCollapsed ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
          </button>
        )}
      </div>

      {/* Progress Bar under topic title */}
      <div className="mt-4 h-1.5 w-full rounded-full bg-[#1F2440] overflow-hidden">
        <div
          className="h-full rounded-full bg-[#5EEAD4] transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Nested Subtopics list */}
      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="mt-6 overflow-hidden"
          >
            <div className="flex flex-col gap-0">
              {subtopics.map((subtopic, subIndex) => (
                <LearningPathNode
                  key={subtopic.id}
                  subtopic={subtopic}
                  isLast={subIndex === total - 1}
                  onRefresh={onRefresh}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Small indicator when collapsed */}
      {isCollapsed && (
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => setIsCollapsed(false)}
            className="text-[11px] font-bold uppercase tracking-[0.5px] text-[#5EEAD4] transition-colors hover:text-[#5EEAD4]/80"
          >
            Show all {total} lessons
          </button>
        </div>
      )}
    </div>
  );
}
