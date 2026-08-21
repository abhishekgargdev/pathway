"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { StreakCounter } from "@/components/dashboard/streak-counter";
import type { DashboardResponse } from "@/lib/dashboard/types";
import { cn } from "@/lib/utils";

async function fetchDashboard(): Promise<DashboardResponse> {
  const res = await fetch("/api/dashboard");
  if (!res.ok) {
    throw new Error("Failed to load dashboard");
  }
  return res.json() as Promise<DashboardResponse>;
}

export function DashboardView() {
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["dashboard"],
    queryFn: fetchDashboard,
  });

  if (isLoading || !data) {
    return <DashboardSkeleton />;
  }

  if (isError) {
    return (
      <main className="mx-auto w-full max-w-3xl px-5 py-6 md:px-6 md:py-8 lg:px-8">
        <div className="rounded-2xl border border-[#FB7185]/30 bg-[#FB7185]/10 px-4 py-5">
          <p className="text-sm text-[#FB7185]">Couldn’t load your dashboard.</p>
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

  const { greeting, streak, continue: cont, skills } = data;

  return (
    <main className="mx-auto w-full max-w-3xl overflow-x-hidden px-5 py-6 md:px-6 md:py-8 lg:px-8">
      <header className="mb-5 md:mb-6">
        <p className="text-[13px] text-[#8B93B0]">{greeting.dateLabel}</p>
        <h1 className="mt-1 font-heading text-[26px] font-bold tracking-tight text-[#EDEFF7]">
          {greeting.hello}, {greeting.name}
        </h1>
        {isFetching ? (
          <p className="mt-1 text-xs text-[#8B93B0]">Refreshing…</p>
        ) : null}
      </header>

      <div className="flex flex-col gap-4 md:gap-5">
        {/* Streak */}
        <section
          className={cn(
            "relative overflow-hidden rounded-2xl border border-[#FBBF24]/20 bg-[#171B2E] p-5",
            "shadow-[0_0_32px_rgba(251,191,36,0.12),0_8px_24px_rgba(0,0,0,0.3)]",
          )}
        >
          <div
            className="pointer-events-none absolute -top-8 -right-8 size-[120px] rounded-full bg-[radial-gradient(circle,rgba(251,191,36,0.15)_0%,transparent_70%)]"
            aria-hidden
          />
          <div className="relative flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="mb-2.5 text-[11px] font-semibold tracking-[0.8px] text-[#8B93B0] uppercase">
                Current streak
              </p>
              <StreakCounter value={streak.days} />
              <p className="mt-1.5 text-[13px] text-[#FBBF24]">
                {streak.days === 1 ? "day in a row" : "days in a row"}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1.5 pt-1">
              {streak.last7Days.map((active, index) => (
                <div
                  key={index}
                  className={cn(
                    "size-2.5 rounded-[3px]",
                    active
                      ? "bg-[#FBBF24] shadow-[0_0_6px_rgba(251,191,36,0.6)]"
                      : "bg-[#2A2F4A]",
                  )}
                  aria-hidden
                />
              ))}
              <p className="mt-0.5 text-[10px] text-[#8B93B0]">last 7 days</p>
            </div>
          </div>
        </section>

        {/* Continue — most elevated */}
        {cont ? (
          <Link
            href={`/subtopics/${cont.subtopicId}`}
            className={cn(
              "relative block overflow-hidden rounded-2xl border border-[#5EEAD4]/25 bg-[#171B2E] p-5",
              "shadow-[0_0_32px_rgba(94,234,212,0.14),0_8px_24px_rgba(0,0,0,0.3)]",
              "transition-transform active:scale-[0.99]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5EEAD4]/40",
            )}
          >
            <div
              className="pointer-events-none absolute -top-10 -left-5 size-40 rounded-full bg-[radial-gradient(circle,rgba(94,234,212,0.1)_0%,transparent_70%)]"
              aria-hidden
            />
            <div className="relative">
              <div className="mb-4 flex items-center justify-between gap-3">
                <span className="rounded-full bg-[#5EEAD4]/15 px-2.5 py-1 text-[11px] font-semibold tracking-[0.5px] text-[#5EEAD4]">
                  CONTINUE
                </span>
                <ArrowRight className="size-4 text-[#5EEAD4]" aria-hidden />
              </div>
              <h2 className="font-heading text-lg font-bold text-[#EDEFF7]">
                {cont.subtopicTitle}
              </h2>
              <p className="mt-1 break-words text-[13px] text-[#8B93B0]">
                {cont.skillName} · {cont.topicTitle}
              </p>
              <div className="mt-4">
                <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-[#2A2F4A]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#5EEAD4] to-[#8B7CF6]"
                    style={{ width: `${cont.percentComplete}%` }}
                  />
                </div>
                <div className="flex justify-between gap-3 text-xs">
                  <span className="text-[#8B93B0]">
                    {cont.percentComplete}% complete
                  </span>
                  <span className="font-mono text-[#5EEAD4]">
                    {cont.completedSubtopics} / {cont.totalSubtopics}
                  </span>
                </div>
              </div>
            </div>
          </Link>
        ) : (
          <section className="rounded-2xl border border-[#2A2F4A] bg-[#171B2E] p-5 shadow-[0_4px_16px_rgba(0,0,0,0.25)]">
            <p className="text-[11px] font-semibold tracking-[0.5px] text-[#8B93B0] uppercase">
              Continue
            </p>
            <p className="mt-2 text-sm text-[#EDEFF7]">
              No in-progress lesson yet.
            </p>
            <p className="mt-1 text-[13px] text-[#8B93B0]">
              Open a skill path to pick up where you leave off next time.
            </p>
          </section>
        )}

        {/* Active skills */}
        <section id="skills">
          <h2 className="mb-3.5 font-heading text-base font-semibold text-[#EDEFF7]">
            Active skills
          </h2>

          {skills.length === 0 ? (
            <div className="rounded-2xl border border-[#2A2F4A] bg-[#171B2E] p-5 shadow-[0_4px_12px_rgba(0,0,0,0.2)]">
              <p className="text-sm text-[#EDEFF7]">No active skills yet.</p>
              <p className="mt-1 text-[13px] text-[#8B93B0]">
                Add a skill to generate your first learning path.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3 md:gap-4">
              {skills.map((skill) => (
                <Link
                  key={skill.id}
                  href={`/skills/${skill.id}`}
                  className={cn(
                    "rounded-2xl border border-[#2A2F4A] bg-[#171B2E] p-4",
                    "shadow-[0_4px_12px_rgba(0,0,0,0.2)]",
                    "transition-transform active:scale-[0.98]",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5EEAD4]/40",
                  )}
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <span className="min-w-0 flex-1 break-words font-heading text-sm font-medium text-[#EDEFF7]">
                      {skill.name}
                    </span>
                    {skill.isNew ? (
                      <span className="shrink-0 rounded-full bg-[#FBBF24]/15 px-2 py-0.5 text-[10px] font-bold tracking-[0.5px] text-[#FBBF24]">
                        NEW
                      </span>
                    ) : null}
                  </div>
                  <div className="mb-2 h-1 overflow-hidden rounded-full bg-[#2A2F4A]">
                    <div
                      className="h-full rounded-full bg-[#5EEAD4] transition-[width] duration-500 ease-out"
                      style={{ width: `${skill.percentComplete}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="text-[#8B93B0]">
                      {skill.completedSubtopics} of {skill.totalSubtopics}{" "}
                      subtopics
                    </span>
                    <span className="font-medium text-[#5EEAD4]">
                      {skill.percentComplete}%
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <Link
          href="/manage"
          className={cn(
            "inline-flex h-11 min-h-11 w-full items-center justify-center rounded-xl",
            "border border-[#2A2F4A] bg-[#171B2E] text-sm font-medium text-[#8B93B0]",
            "transition-colors hover:text-[#EDEFF7]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5EEAD4]/40",
          )}
        >
          Content Ops →
        </Link>
      </div>
    </main>
  );
}
