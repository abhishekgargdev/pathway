"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, RefreshCw, AlertTriangle, BookOpen } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { LearningPath } from "@/components/learning-path/LearningPath";
import { ProgressSummary } from "@/components/learning-path/ProgressSummary";
import { SkillPathSkeleton } from "@/components/skills/skill-path-skeleton";
import type { SkillTreeResponse } from "@/lib/skills/tree-types";
import { cn } from "@/lib/utils";

async function fetchSkillTree(skillId: string): Promise<SkillTreeResponse> {
  const res = await fetch(`/api/skills/${skillId}/tree`);
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? "Failed to load learning path");
  }
  return res.json() as Promise<SkillTreeResponse>;
}

export default function SkillPage() {
  const params = useParams();
  const skillId = params.skillId as string;

  // Fetch skill tree using TanStack Query.
  // If the skill has no topics yet, it's still preparing the outline,
  // so we poll every 4 seconds to update the UI automatically.
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["skill-tree", skillId],
    queryFn: () => fetchSkillTree(skillId),
    refetchInterval: (query) => {
      const topics = query.state.data?.topics ?? [];
      return topics.length === 0 ? 4000 : false;
    },
  });

  if (isLoading) {
    return <SkillPathSkeleton />;
  }

  // Error state
  if (isError || !data) {
    return (
      <main className="mx-auto w-full max-w-3xl px-5 py-8 md:px-6 md:py-12 lg:px-8">
        <Link
          href="/skills"
          className={cn(
            "mb-6 inline-flex size-10 items-center justify-center rounded-xl",
            "border border-[#2A2F4A] bg-[#1F2440] text-[#EDEFF7]",
            "transition-colors hover:border-[#5EEAD4]/30 hover:text-[#5EEAD4]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5EEAD4]/40",
          )}
          aria-label="Back to My Skills"
        >
          <ArrowLeft className="size-4" />
        </Link>

        <div className="rounded-2xl border border-[#FB7185]/30 bg-[#FB7185]/5 p-6 text-center shadow-[0_8px_32px_rgba(0,0,0,0.25)]">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-[#FB7185]/10 text-[#FB7185]">
            <AlertTriangle className="size-6" />
          </div>
          <h2 className="mt-4 font-heading text-lg font-bold text-[#EDEFF7]">
            Unable to load your learning path.
          </h2>
          <p className="mt-2 text-sm text-[#8B93B0] max-w-md mx-auto">
            {error instanceof Error ? error.message : "An unexpected error occurred."}
          </p>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => void refetch()}
              className={cn(
                "inline-flex h-11 min-h-11 items-center justify-center rounded-xl bg-[#1F2440] px-5 text-sm font-semibold text-[#EDEFF7] border border-[#2A2F4A]",
                "transition-colors hover:bg-[#1F2440]/80",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5EEAD4]/40",
              )}
            >
              Try Again
            </button>
            <Link
              href="/skills"
              className={cn(
                "inline-flex h-11 min-h-11 items-center justify-center rounded-xl bg-[#5EEAD4] px-5 text-sm font-semibold text-[#0E1220]",
                "transition-colors hover:bg-[#5EEAD4]/90",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5EEAD4]/40",
              )}
            >
              Back to My Skills
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const { skill, stats, topics, path } = data;

  // Resolve continue target (first in-progress, or first available)
  let continueTarget = null;
  const inProgressNode = path.find((node) => node.state === "in-progress");
  if (inProgressNode) {
    continueTarget = {
      id: inProgressNode.id,
      title: inProgressNode.label,
      state: "in-progress",
    };
  } else {
    const availableNode = path.find((node) => node.state === "available");
    if (availableNode) {
      continueTarget = {
        id: availableNode.id,
        title: availableNode.label,
        state: "available",
      };
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-6 md:px-6 md:py-8 lg:px-8 text-[#EDEFF7] min-h-screen pb-20">
      {/* Back button */}
      <Link
        href="/skills"
        className={cn(
          "mb-5 inline-flex size-10 items-center justify-center rounded-xl",
          "border border-[#2A2F4A] bg-[#1F2440] text-[#EDEFF7]",
          "transition-colors hover:border-[#5EEAD4]/30 hover:text-[#5EEAD4]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5EEAD4]/40",
        )}
        aria-label="Back to My Skills"
      >
        <ArrowLeft className="size-4" />
      </Link>

      {/* Progress Summary Section */}
      <div className="mb-6">
        <ProgressSummary
          skillName={skill.name}
          description={skill.description}
          completedSubtopics={stats.completedSubtopics}
          totalSubtopics={stats.totalSubtopics}
          percentComplete={stats.percentComplete}
          continueTarget={continueTarget}
        />
      </div>

      {topics.length === 0 ? (
        /* Empty preparing outline state */
        <div className="rounded-2xl border border-[#2A2F4A] bg-[#171B2E] p-8 py-16 text-center shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-[#5EEAD4]/10 text-[#5EEAD4] animate-pulse">
            <BookOpen className="size-6" />
          </div>
          <h2 className="mt-4 font-heading text-lg font-bold text-[#EDEFF7] md:text-xl">
            Preparing your learning path...
          </h2>
          <p className="mt-2 max-w-md text-sm text-[#8B93B0] leading-relaxed mx-auto">
            Pathway is generating your custom skill topics. This page will automatically update in a few seconds.
          </p>
          <div className="mt-6">
            <button
              type="button"
              onClick={() => void refetch()}
              className={cn(
                "inline-flex h-10 items-center gap-2 rounded-xl border border-[#2A2F4A] bg-[#1F2440] px-4 text-xs font-semibold text-[#EDEFF7]",
                "transition-colors hover:border-[#5EEAD4]/30 hover:text-[#5EEAD4]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5EEAD4]/40",
              )}
            >
              <RefreshCw className="size-3.5" />
              Refresh
            </button>
          </div>
        </div>
      ) : (
        /* Topics & Nodes learning path list */
        <LearningPath topics={topics} onRefresh={() => void refetch()} />
      )}
    </main>
  );
}
