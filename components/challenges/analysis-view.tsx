"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import type { SolutionAnalysisResponse } from "@/lib/challenges/types";
import { cn } from "@/lib/utils";

function ComplexityBadge({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#2A2F4A] bg-[#1F2440] px-2.5 py-1 font-mono text-[12px] text-[#5EEAD4]">
      <span className="text-[#8B93B0]">{label}</span>
      {value}
    </span>
  );
}

function ConceptPill({
  label,
  variant = "violet",
}: {
  label: string;
  variant?: "violet" | "teal";
}) {
  return (
    <span
      className={cn(
        "rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
        variant === "violet"
          ? "border-[#8B7CF6]/30 bg-[#8B7CF6]/15 text-[#8B7CF6]"
          : "border-[#5EEAD4]/30 bg-[#5EEAD4]/10 text-[#5EEAD4]",
      )}
    >
      {label}
    </span>
  );
}

async function fetchAnalysis(
  challengeId: string,
): Promise<SolutionAnalysisResponse> {
  const res = await fetch(`/api/challenges/${challengeId}/analysis`);
  const data = (await res.json()) as SolutionAnalysisResponse & {
    error?: string;
  };
  if (res.status === 403) return data;
  if (!res.ok && data.status !== "ready_tomorrow") {
    throw new Error(data.message ?? data.error ?? "Failed to load analysis");
  }
  return data;
}

export function AnalysisView({
  challengeId,
  skillId,
}: {
  challengeId: string;
  skillId?: string;
}) {
  const [active, setActive] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["analysis", challengeId],
    queryFn: () => fetchAnalysis(challengeId),
  });

  if (isLoading) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-5 py-6 md:px-6 lg:px-8">
        <Skeleton className="h-8 w-48 rounded-md bg-[#1F2440]" />
        <Skeleton className="h-40 w-full rounded-2xl bg-[#171B2E]" />
        <Skeleton className="h-56 w-full rounded-2xl bg-[#171B2E]" />
      </div>
    );
  }

  if (data?.status === "forbidden") {
    return (
      <main className="mx-auto w-full max-w-lg px-5 py-6">
        <Link
          href={`/challenges/${challengeId}`}
          className="mb-4 inline-flex size-9 items-center justify-center rounded-[10px] border border-[#2A2F4A] bg-[#1F2440] text-[#EDEFF7]"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div className="rounded-2xl border border-[#FBBF24]/25 bg-[#171B2E] p-5">
          <p className="font-heading text-lg font-semibold text-[#EDEFF7]">
            Pass the challenge first
          </p>
          <p className="mt-2 text-sm text-[#8B93B0]">
            {data.message ??
              "Solution analysis unlocks after all tests pass."}
          </p>
          <Link
            href={`/challenges/${challengeId}`}
            className="mt-4 inline-flex h-11 items-center justify-center rounded-xl bg-[#5EEAD4] px-4 font-heading text-sm font-semibold text-[#0E1220]"
          >
            Back to challenge
          </Link>
        </div>
      </main>
    );
  }

  if (data?.status === "ready_tomorrow") {
    return (
      <main className="mx-auto w-full max-w-lg px-5 py-6">
        <Link
          href={`/challenges/${challengeId}`}
          className="mb-4 inline-flex size-9 items-center justify-center rounded-[10px] border border-[#2A2F4A] bg-[#1F2440] text-[#EDEFF7]"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div className="rounded-2xl border border-[#FBBF24]/25 bg-[#171B2E] p-5">
          <p className="font-heading text-lg font-semibold text-[#EDEFF7]">
            Ready in tomorrow’s batch
          </p>
          <p className="mt-2 text-sm text-[#8B93B0]">
            Analysis will generate in the next daily run once quota resets.
          </p>
        </div>
      </main>
    );
  }

  if (isError || !data?.analysis) {
    return (
      <main className="mx-auto w-full max-w-lg px-5 py-6">
        <Link
          href={`/challenges/${challengeId}`}
          className="mb-4 inline-flex size-9 items-center justify-center rounded-[10px] border border-[#2A2F4A] bg-[#1F2440] text-[#EDEFF7]"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div className="rounded-2xl border border-[#FB7185]/30 bg-[#FB7185]/10 p-4 text-sm text-[#FB7185]">
          {error instanceof Error
            ? error.message
            : data?.message ?? "Analysis unavailable."}
          <button
            type="button"
            onClick={() => void refetch()}
            className="mt-3 block h-11 rounded-xl bg-[#171B2E] px-4 text-[#EDEFF7]"
          >
            Try again
          </button>
        </div>
      </main>
    );
  }

  const { analysis } = data;
  const alts = analysis.alternatives;
  const resolvedSkillId = skillId ?? data.skillId;
  const backHref = resolvedSkillId
    ? `/skills/${resolvedSkillId}`
    : `/challenges/${challengeId}`;

  function scrollToAlt(index: number) {
    setActive(index);
    const el = carouselRef.current;
    if (!el) return;
    const card = el.children[index] as HTMLElement | undefined;
    card?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col overflow-x-hidden px-5 py-6 pb-28 md:px-6 md:pb-10 lg:px-8">
      <div className="mb-5 flex items-center gap-3">
        <Link
          href={`/challenges/${challengeId}`}
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-[10px] border border-[#2A2F4A] bg-[#1F2440] text-[#EDEFF7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5EEAD4]/40"
          aria-label="Back to challenge"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="font-heading text-[22px] font-bold text-[#EDEFF7]">
            Solution Analysis
          </h1>
          <p className="text-sm text-[#8B93B0]">
            {alts.length} alternative approaches
          </p>
        </div>
        {isFetching ? (
          <Loader2 className="size-4 shrink-0 animate-spin text-[#8B93B0]" />
        ) : null}
      </div>

      {/* Your solution — visually distinct */}
      <section
        className={cn(
          "mb-6 rounded-2xl border p-5",
          "border-[#5EEAD4]/25 bg-[#5EEAD4]/6",
          "shadow-[0_0_20px_rgba(94,234,212,0.08)]",
        )}
      >
        <div className="mb-3 flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-full bg-[#5EEAD4]">
            <Check className="size-3.5 text-[#0E1220]" strokeWidth={2.5} />
          </div>
          <h2 className="font-heading text-base font-semibold text-[#EDEFF7]">
            Your solution
          </h2>
        </div>
        <p className="mb-2 text-[14px] leading-relaxed text-[#EDEFF7]">
          {analysis.yourSolution.feedback}
        </p>
        <p className="mb-3 text-[13px] leading-relaxed text-[#8B93B0]">
          {analysis.yourSolution.reasoning}
        </p>
        <div className="mb-4 flex flex-wrap gap-2">
          <ComplexityBadge
            label="Time"
            value={analysis.yourSolution.timeComplexity}
          />
          <ComplexityBadge
            label="Space"
            value={analysis.yourSolution.spaceComplexity}
          />
        </div>
        <pre className="max-h-48 overflow-auto rounded-xl border border-[#2A2F4A] bg-[#0A0D1A] p-4 font-mono text-[12.5px] leading-relaxed text-[#EDEFF7]">
          <code>{analysis.submission.code}</code>
        </pre>
      </section>

      <h2 className="mb-3 font-heading text-base font-semibold text-[#EDEFF7]">
        5 alternative solutions
      </h2>

      {/* Mobile tab chips */}
      <div className="mb-3 flex gap-2 overflow-x-auto pb-1 md:hidden">
        {alts.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => scrollToAlt(i)}
            className={cn(
              "shrink-0 rounded-full border px-3.5 py-1.5 text-[13px]",
              active === i
                ? "border-[#5EEAD4]/40 bg-[#5EEAD4]/12 text-[#5EEAD4]"
                : "border-[#2A2F4A] bg-[#1F2440] text-[#8B93B0]",
            )}
          >
            {i + 1}
          </button>
        ))}
      </div>

      {/* Mobile carousel / desktop grid */}
      <div
        ref={carouselRef}
        onScroll={() => {
          const el = carouselRef.current;
          if (!el) return;
          const cardWidth = el.clientWidth * 0.85 + 12;
          const idx = Math.round(el.scrollLeft / cardWidth);
          if (idx !== active && idx >= 0 && idx < alts.length) setActive(idx);
        }}
        className={cn(
          "flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory",
          "md:grid md:grid-cols-2 lg:grid-cols-3 md:overflow-visible md:snap-none md:pb-0",
          "[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        )}
      >
        {alts.map((alt, i) => (
          <article
            key={i}
            className={cn(
              "w-[85%] shrink-0 snap-center overflow-hidden rounded-2xl border border-[#2A2F4A] bg-[#171B2E]",
              "shadow-[0_4px_16px_rgba(0,0,0,0.25)]",
              "md:w-auto md:shrink",
            )}
          >
            <div className="border-b border-[#2A2F4A] px-4 pt-4 pb-3">
              <div className="mb-2 flex items-start justify-between gap-2">
                <span className="font-heading text-[15px] font-semibold text-[#EDEFF7]">
                  Approach {i + 1}
                </span>
                <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
                  <ComplexityBadge label="T" value={alt.timeComplexity} />
                  <ComplexityBadge label="S" value={alt.spaceComplexity} />
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {alt.dsaConcepts.map((c) => (
                  <ConceptPill key={`dsa-${c}`} label={c} />
                ))}
                {alt.conceptsUsed.map((c) => (
                  <ConceptPill key={`c-${c}`} label={c} variant="teal" />
                ))}
              </div>
            </div>
            <pre className="max-h-52 overflow-auto bg-[#0A0D1A] p-4 font-mono text-[12.5px] leading-relaxed text-[#EDEFF7]">
              <code>{alt.code}</code>
            </pre>
            <div className="border-t border-[#2A2F4A] px-4 py-3">
              <p className="text-[13px] leading-relaxed text-[#8B93B0]">
                {alt.reasoning}
              </p>
              <p className="mt-1 font-mono text-[11px] text-[#8B93B0]/80">
                {alt.language}
              </p>
            </div>
          </article>
        ))}
      </div>

      <Link
        href={backHref}
        className="mt-6 inline-flex h-12 min-h-12 w-full items-center justify-center rounded-xl bg-[#5EEAD4] font-heading text-[16px] font-semibold text-[#0E1220] shadow-[0_0_20px_rgba(94,234,212,0.25)] md:max-w-sm"
      >
        Back to path
      </Link>
    </div>
  );
}
