import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

type ChallengePreviewProps = {
  className?: string;
};

/**
 * Static marketing preview of a passed coding challenge + complexity badges.
 */
export function ChallengePreview({ className }: ChallengePreviewProps) {
  const tests = [
    { input: "[1,2,3,4,5]", expected: "[5,4,3,2,1]" },
    { input: "[1,2]", expected: "[2,1]" },
    { input: "[]", expected: "[]" },
  ];

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-[#2A2F4A] bg-[#171B2E]",
        "shadow-[0_8px_24px_rgba(0,0,0,0.3)]",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3 border-b border-[#2A2F4A] bg-[#1F2440] px-4 py-3">
        <h3 className="min-w-0 truncate font-heading text-[13px] font-semibold text-[#EDEFF7]">
          Reverse a Linked List
        </h3>
        <span className="shrink-0 rounded-full bg-[#5EEAD4]/15 px-2 py-0.5 text-[10px] font-bold text-[#5EEAD4]">
          Easy
        </span>
      </div>

      <div className="flex flex-col gap-2 px-4 py-3">
        {tests.map((test) => (
          <div key={test.input} className="flex min-w-0 items-center gap-2">
            <span className="flex size-3.5 shrink-0 items-center justify-center rounded-full bg-[#5EEAD4]">
              <Check className="size-2 stroke-[#0E1220] stroke-[3.5]" aria-hidden />
            </span>
            <code className="min-w-0 truncate font-mono text-[11px] text-[#8B93B0]">
              {test.input} →{" "}
              <span className="text-[#5EEAD4]">{test.expected}</span>
            </code>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 px-4 pb-3">
        <span className="rounded-full border border-[#2A2F4A] bg-[#1F2440] px-2.5 py-1 font-mono text-[11px] text-[#5EEAD4]">
          <span className="text-[#8B93B0]">Time</span> O(n)
        </span>
        <span className="rounded-full border border-[#2A2F4A] bg-[#1F2440] px-2.5 py-1 font-mono text-[11px] text-[#5EEAD4]">
          <span className="text-[#8B93B0]">Space</span> O(1)
        </span>
        <span className="ml-auto rounded-full bg-[#FBBF24]/15 px-2 py-1 text-[11px] font-bold text-[#FBBF24]">
          ★★★★★
        </span>
      </div>
    </div>
  );
}
