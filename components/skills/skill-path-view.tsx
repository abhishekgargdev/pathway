"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import {
  LearningPath,
  type PathNodeData,
  type PathNodeState,
} from "@/components/learning-path/learning-path";
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

export function SkillPathView({ skillId }: { skillId: string }) {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["skill-tree", skillId],
    queryFn: () => fetchSkillTree(skillId),
  });

  if (isLoading) {
    return <SkillPathSkeleton />;
  }

  if (isError || !data) {
    return (
      <main className="mx-auto w-full max-w-3xl px-5 py-6 md:px-6 md:py-8 lg:px-8">
        <Link
          href="/skills"
          className="mb-5 inline-flex size-10 items-center justify-center rounded-xl border border-[#2A2F4A] bg-[#1F2440] text-[#EDEFF7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5EEAD4]/40"
          aria-label="Back to My Skills"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div className="rounded-2xl border border-[#FB7185]/30 bg-[#FB7185]/10 px-4 py-5">
          <p className="text-sm text-[#FB7185]">
            {error instanceof Error
              ? error.message
              : "Couldn’t load this learning path."}
          </p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="mt-3 inline-flex h-11 min-h-11 items-center rounded-xl bg-[#171B2E] px-4 text-sm text-[#EDEFF7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5EEAD4]/40"
          >
            Try again
          </button>
        </div>
      </main>
    );
  }

  const nodes: PathNodeData[] = data.path.map((item) => {
    let state = item.state;
    if (state === "generating" || state === "failed") {
      state = "locked";
    }
    return {
      id: item.id,
      label: item.label,
      subtitle: item.subtitle,
      state: state as PathNodeState,
      href: item.href,
    };
  });

  return (
    <main className="mx-auto w-full max-w-3xl overflow-x-hidden px-5 py-6 md:px-6 md:py-8 lg:px-8">
      <header className="mb-5 flex items-start gap-3 md:mb-6">
        <Link
          href="/skills"
          className={cn(
            "inline-flex size-10 shrink-0 items-center justify-center rounded-xl",
            "border border-[#2A2F4A] bg-[#1F2440] text-[#EDEFF7]",
            "transition-colors hover:border-[#5EEAD4]/30 hover:text-[#5EEAD4]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5EEAD4]/40",
          )}
          aria-label="Back to My Skills"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="font-heading text-lg font-bold tracking-tight break-words text-[#EDEFF7] md:text-xl">
            {data.skill.name}
          </h1>
          <p className="mt-1 text-xs text-[#8B93B0] md:text-[13px]">
            {data.stats.completedSubtopics} of {data.stats.totalSubtopics}{" "}
            subtopics complete · {data.stats.percentComplete}%
          </p>
          {data.skill.description ? (
            <p className="mt-2 text-[13px] leading-relaxed break-words text-[#8B93B0]">
              {data.skill.description}
            </p>
          ) : null}
        </div>
      </header>

      {nodes.length === 0 ? (
        <div className="rounded-2xl border border-[#2A2F4A] bg-[#171B2E] p-5 shadow-[0_4px_16px_rgba(0,0,0,0.25)]">
          <p className="text-sm text-[#EDEFF7]">No path nodes yet.</p>
          <p className="mt-1 text-[13px] text-[#8B93B0]">
            The outline may still be generating. Check back shortly.
          </p>
        </div>
      ) : (
        <LearningPath
          title="Your path"
          nodes={nodes}
          className="shadow-[0_8px_32px_rgba(0,0,0,0.35)]"
        />
      )}

      {data.challenges && data.challenges.length > 0 ? (
        <section className="mt-5 flex flex-col gap-3 md:mt-6">
          <h2 className="font-heading text-sm font-semibold text-[#EDEFF7]">
            Coding challenges
          </h2>
          <div className="flex flex-col gap-2">
            {data.challenges.map((ch) => (
              <Link
                key={ch.id}
                href={ch.href ?? `/challenges/${ch.id}`}
                className={cn(
                  "rounded-2xl border border-[#2A2F4A] bg-[#171B2E] px-4 py-3",
                  "shadow-[0_4px_16px_rgba(0,0,0,0.2)]",
                  "transition-colors hover:border-[#5EEAD4]/30",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5EEAD4]/40",
                )}
              >
                <p className="font-heading text-sm font-semibold text-[#EDEFF7]">
                  {ch.topicTitle ?? "Challenge"}
                </p>
                <p className="mt-0.5 text-[12px] capitalize text-[#8B93B0]">
                  {ch.difficulty ?? "mixed"} · {ch.status}
                </p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
