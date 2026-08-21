"use client";

import { Play, BookOpen, CheckCircle } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

type ContinueTarget = {
  id: string;
  title: string;
  state: string;
};

type ProgressSummaryProps = {
  skillName: string;
  description: string | null;
  completedSubtopics: number;
  totalSubtopics: number;
  percentComplete: number;
  continueTarget: ContinueTarget | null;
};

export function ProgressSummary({
  skillName,
  description,
  completedSubtopics,
  totalSubtopics,
  percentComplete,
  continueTarget,
}: ProgressSummaryProps) {
  const isFinished = percentComplete === 100;

  return (
    <div className="rounded-2xl border border-[#2A2F4A] bg-[#171B2E] p-5 md:p-6 shadow-[0_8px_32px_rgba(0,0,0,0.35)] relative overflow-hidden group">
      {/* Background glow overlay */}
      <div className="absolute -top-24 -right-24 size-48 rounded-full bg-[#5EEAD4]/5 blur-[64px]" />

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="flex-1 space-y-3">
          <div>
            <h1 className="font-heading text-2xl font-bold tracking-tight text-[#EDEFF7] md:text-3xl">
              {skillName}
            </h1>
            {description && (
              <p className="mt-2 text-sm leading-relaxed text-[#8B93B0] max-w-xl">
                {description}
              </p>
            )}
          </div>

          {/* Progress bar and metrics */}
          <div className="space-y-2 max-w-md">
            <div className="flex items-center justify-between text-xs font-semibold text-[#8B93B0]">
              <span>
                {completedSubtopics} of {totalSubtopics} subtopics complete
              </span>
              <span className="text-[#5EEAD4]">{percentComplete}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-[#1F2440] overflow-hidden">
              <div
                className="h-full rounded-full bg-[#5EEAD4] transition-all duration-500 ease-out"
                style={{ width: `${percentComplete}%` }}
              />
            </div>
          </div>

          {/* Current In-progress target */}
          {continueTarget && (
            <div className="flex items-center gap-2 pt-1">
              <span className="size-2 shrink-0 rounded-full bg-[#5EEAD4] animate-pulse" />
              <p className="text-xs font-medium text-[#8B93B0] truncate">
                <span className="text-[#5EEAD4] font-semibold">
                  {continueTarget.state === "in-progress" ? "Resume: " : "Next up: "}
                </span>
                {continueTarget.title}
              </p>
            </div>
          )}
        </div>

        {/* Continue Learning Action CTA */}
        <div className="flex shrink-0">
          {continueTarget ? (
            <Link
              href={`/subtopics/${continueTarget.id}`}
              className={cn(
                "inline-flex h-12 w-full md:w-auto items-center justify-center gap-2 rounded-xl bg-[#5EEAD4] px-6 font-heading text-sm font-bold text-[#0E1220]",
                "shadow-[0_0_24px_rgba(94,234,212,0.25)] transition-all",
                "hover:bg-[#5EEAD4]/90 hover:shadow-[0_0_32px_rgba(94,234,212,0.35)]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5EEAD4]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#171B2E]",
              )}
            >
              <Play className="size-4 fill-current stroke-none" />
              Continue Learning
            </Link>
          ) : isFinished ? (
            <div className="inline-flex h-12 w-full md:w-auto items-center justify-center gap-2 rounded-xl border border-[#5EEAD4]/20 bg-[#5EEAD4]/10 px-6 font-heading text-sm font-bold text-[#5EEAD4]">
              <CheckCircle className="size-4" />
              Path Completed!
            </div>
          ) : (
            <div className="inline-flex h-12 w-full md:w-auto items-center justify-center gap-2 rounded-xl border border-[#2A2F4A] bg-[#1F2440]/30 px-6 font-heading text-sm font-bold text-[#8B93B0]">
              <BookOpen className="size-4" />
              Preparing path...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
