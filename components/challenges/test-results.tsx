"use client";

import { Check, X } from "lucide-react";

import type { ChallengeTestResult } from "@/lib/challenges/types";
import { cn } from "@/lib/utils";

export function TestResultsPanel({
  results,
  className,
}: {
  results: ChallengeTestResult[];
  className?: string;
}) {
  if (results.length === 0) return null;

  const passedCount = results.filter((r) => r.passed).length;

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-heading text-sm font-semibold text-[#EDEFF7]">
          Test Results
        </h2>
        <span className="font-mono text-xs text-[#8B93B0]">
          {passedCount}/{results.length} passed
        </span>
      </div>
      <div className="flex max-h-[280px] flex-col gap-2 overflow-y-auto pr-1 md:max-h-[360px]">
        {results.map((t, i) => (
          <div
            key={i}
            className={cn(
              "flex items-start gap-3 rounded-xl border p-3",
              t.passed
                ? "border-[#5EEAD4]/25 bg-[#5EEAD4]/6"
                : "border-[#FB7185]/25 bg-[#FB7185]/6",
            )}
          >
            <div
              className={cn(
                "mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded-full",
                t.passed ? "bg-[#5EEAD4]" : "bg-[#FB7185]",
              )}
            >
              {t.passed ? (
                <Check className="size-2.5 text-[#0E1220]" strokeWidth={3} />
              ) : (
                <X className="size-2.5 text-[#0E1220]" strokeWidth={3} />
              )}
            </div>
            <code className="min-w-0 flex-1 break-words font-mono text-[12px] leading-relaxed text-[#8B93B0]">
              <span className="text-[#8B93B0]">Input: </span>
              <span className="text-[#EDEFF7]">{t.input}</span>
              {"\n"}
              <span className="text-[#8B93B0]">Expected: </span>
              <span className="text-[#EDEFF7]">{t.expected}</span>
              {"\n"}
              <span className="text-[#8B93B0]">Got: </span>
              <span className={t.passed ? "text-[#5EEAD4]" : "text-[#FB7185]"}>
                {t.actual}
              </span>
            </code>
          </div>
        ))}
      </div>
    </div>
  );
}
