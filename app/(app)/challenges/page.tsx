"use client";

import { useQuery } from "@tanstack/react-query";
import { Code2, Search, CheckCircle2, Loader2, Play } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { cn } from "@/lib/utils";

type ChallengeItem = {
  id: string;
  skillId: string;
  skillName: string;
  topicTitle: string;
  difficulty: "easy" | "medium" | "hard";
  status: "queued" | "processing" | "ready" | "failed";
  completed: boolean;
  createdAt: string;
};

async function fetchChallenges(): Promise<{ challenges: ChallengeItem[] }> {
  const res = await fetch("/api/challenges");
  if (!res.ok) {
    throw new Error("Failed to load coding challenges");
  }
  return res.json() as Promise<{ challenges: ChallengeItem[] }>;
}

export default function ChallengesPage() {
  const [search, setSearch] = useState("");
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["challenges-list"],
    queryFn: fetchChallenges,
  });

  const challenges = data?.challenges ?? [];
  const filtered = challenges.filter(
    (c) =>
      c.skillName.toLowerCase().includes(search.toLowerCase()) ||
      c.topicTitle.toLowerCase().includes(search.toLowerCase()),
  );

  const getDifficultyColor = (diff: "easy" | "medium" | "hard") => {
    switch (diff) {
      case "easy":
        return "border-[#10B981]/20 bg-[#10B981]/10 text-[#10B981]";
      case "medium":
        return "border-[#F59E0B]/20 bg-[#F59E0B]/10 text-[#F59E0B]";
      case "hard":
        return "border-[#EF4444]/20 bg-[#EF4444]/10 text-[#EF4444]";
      default:
        return "border-[#8B93B0]/20 bg-[#8B93B0]/10 text-[#8B93B0]";
    }
  };

  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-6 md:px-8 md:py-10">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-[#EDEFF7] md:text-3xl">
            Coding Challenges
          </h1>
          <p className="mt-1 text-sm text-[#8B93B0]">
            Browse and solve algorithm and coding problems generated for your curriculum.
          </p>
        </div>
      </header>

      {/* Search Input */}
      <div className="relative mb-6 w-full max-w-md">
        <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-[#8B93B0]">
          <Search className="size-4" />
        </span>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter by skill or topic name..."
          className={cn(
            "w-full h-11 pl-10 pr-4 rounded-xl border border-[#2A2F4A] bg-[#171B2E] text-sm text-[#EDEFF7] placeholder-[#8B93B0] outline-none transition-colors",
            "focus:border-[#5EEAD4]/50 focus:ring-1 focus:ring-[#5EEAD4]/50",
          )}
        />
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-[#8B93B0]">
          <Loader2 className="size-8 animate-spin text-[#5EEAD4]" />
          <p className="mt-3 text-sm">Loading challenges...</p>
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-[#FB7185]/30 bg-[#FB7185]/10 p-5 text-center">
          <p className="text-sm text-[#FB7185]">
            {error instanceof Error ? error.message : "Failed to load challenges list."}
          </p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="mt-3 inline-flex h-9 items-center rounded-xl bg-[#171B2E] px-4 text-xs font-semibold text-[#EDEFF7] border border-[#2A2F4A] hover:bg-white/[0.04]"
          >
            Try Again
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-[#2A2F4A] bg-[#171B2E] p-8 text-center shadow-[0_4px_16px_rgba(0,0,0,0.25)]">
          <Code2 className="mx-auto size-12 text-[#8B93B0]/60" />
          <h3 className="mt-4 text-base font-bold text-[#EDEFF7]">No challenges found</h3>
          <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-[#8B93B0]">
            {search
              ? "Try adjusting your filter search term."
              : "Challenges are created automatically as you progress through skill learning paths."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((ch) => (
            <div
              key={ch.id}
              className={cn(
                "group relative rounded-2xl border border-[#2A2F4A] bg-[#171B2E] p-5 shadow-[0_4px_16px_rgba(0,0,0,0.2)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#5EEAD4]/30 hover:shadow-[0_8px_24px_rgba(0,0,0,0.3)]",
                ch.completed && "border-[#10B981]/20 bg-[#10B981]/5",
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <span className="inline-flex rounded-lg bg-[#5EEAD4]/10 px-2 py-0.5 text-[11px] font-medium text-[#5EEAD4]">
                    {ch.skillName}
                  </span>
                  <h3 className="mt-2.5 font-heading text-base font-semibold leading-tight text-[#EDEFF7] break-words">
                    {ch.topicTitle}
                  </h3>
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  {ch.completed ? (
                    <span className="flex items-center gap-1 text-[#10B981] text-xs font-medium">
                      <CheckCircle2 className="size-4 shrink-0" />
                      Completed
                    </span>
                  ) : ch.status === "ready" ? (
                    <span className="inline-flex rounded-md border px-1.5 py-0.5 text-[10px] uppercase font-bold tracking-wider border-[#5EEAD4]/20 bg-[#5EEAD4]/10 text-[#5EEAD4]">
                      Ready
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[#8B93B0] text-[11px]">
                      <Loader2 className="size-3.5 animate-spin text-[#5EEAD4]" />
                      Generating
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-[#2A2F4A]/60 pt-4">
                <span
                  className={cn(
                    "inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize",
                    getDifficultyColor(ch.difficulty),
                  )}
                >
                  {ch.difficulty}
                </span>

                <Link
                  href={`/challenges/${ch.id}`}
                  className={cn(
                    "inline-flex h-9 items-center gap-1.5 rounded-xl px-4 text-xs font-semibold transition-all",
                    ch.completed
                      ? "bg-[#10B981]/10 text-[#10B981] hover:bg-[#10B981]/20"
                      : "bg-[#5EEAD4] text-[#0E1220] shadow-[0_2px_8px_rgba(94,234,212,0.25)] hover:bg-[#5EEAD4]/90 hover:shadow-[0_4px_16px_rgba(94,234,212,0.4)]",
                  )}
                >
                  {ch.completed ? "View Analysis" : "Solve Challenge"}
                  <Play className="size-3 shrink-0 fill-current" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
