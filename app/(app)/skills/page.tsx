"use client";

import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  BookOpen,
  Calendar,
  Loader2,
  Plus,
  Search,
} from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";

import { AddSkillDialog } from "@/components/skills/add-skill-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type UserSkill = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  createdAt: string;
  generationStatus: "generating" | "ready" | "failed";
  progress: {
    completedSubtopics: number;
    totalSubtopics: number;
    percentComplete: number;
  };
  currentSubtopic: {
    id: string;
    title: string;
    topicId: string;
  } | null;
  lastActivityAt: string | null;
};

type GetSkillsResponse = {
  skills: UserSkill[];
};

async function fetchUserSkills(): Promise<GetSkillsResponse> {
  const res = await fetch("/api/skills");
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? "Failed to load skills library");
  }
  return res.json() as Promise<GetSkillsResponse>;
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

// Micro-animations variables
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } },
};

export default function MySkillsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [, startTransition] = useTransition();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["skills"],
    queryFn: fetchUserSkills,
  });

  const skills = data?.skills ?? [];

  // Filter skills client-side
  const filteredSkills = skills.filter((skill) =>
    skill.name.toLowerCase().includes(searchQuery.toLowerCase().trim()),
  );

  const existingNames = skills.map((s) => s.name);

  // Loading skeleton layout
  if (isLoading) {
    return (
      <main className="mx-auto w-full max-w-7xl px-5 py-6 md:px-8 md:py-10 text-[#EDEFF7]">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="font-heading text-2xl font-bold tracking-tight md:text-3xl text-[#EDEFF7]">
              My Skills
            </h1>
            <p className="mt-1 text-sm text-[#8B93B0]">
              Build your skills through guided learning paths.
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-[#8B93B0]" />
            <input
              type="text"
              disabled
              placeholder="Search skills..."
              className="h-11 w-full rounded-xl border border-[#2A2F4A] bg-[#171B2E]/50 px-11 text-sm text-[#EDEFF7] placeholder:text-[#8B93B0]/50 focus:outline-none"
            />
          </div>
          <div className="h-11 w-32 rounded-xl bg-[#1F2440] animate-pulse" />
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex flex-col justify-between rounded-2xl border border-[#2A2F4A] bg-[#171B2E] p-6 shadow-[0_4px_16px_rgba(0,0,0,0.2)]"
            >
              <div>
                <div className="flex items-center justify-between">
                  <Skeleton className="h-6 w-32 bg-[#1F2440]" />
                  <Skeleton className="h-5 w-16 rounded-full bg-[#1F2440]" />
                </div>
                <Skeleton className="mt-4 h-4 w-full bg-[#1F2440]" />
                <Skeleton className="mt-2 h-4 w-3/4 bg-[#1F2440]" />
              </div>
              <div className="mt-8 space-y-4">
                <div className="flex justify-between">
                  <Skeleton className="h-3 w-28 bg-[#1F2440]" />
                  <Skeleton className="h-3 w-10 bg-[#1F2440]" />
                </div>
                <Skeleton className="h-2 w-full rounded-full bg-[#1F2440]" />
                <div className="flex gap-3 pt-2">
                  <Skeleton className="h-10 flex-1 rounded-xl bg-[#1F2440]" />
                  <Skeleton className="h-10 flex-1 rounded-xl bg-[#1F2440]" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    );
  }

  // Error layout
  if (isError) {
    return (
      <main className="mx-auto w-full max-w-3xl px-5 py-12 md:py-20 text-[#EDEFF7]">
        <div className="flex flex-col items-center text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-[#FB7185]/10 text-[#FB7185]">
            <AlertCircle className="size-8" />
          </div>
          <h1 className="mt-4 font-heading text-lg font-bold text-[#EDEFF7] md:text-xl">
            Unable to load your skills.
          </h1>
          <p className="mt-2 text-sm text-[#8B93B0] max-w-md">
            {error instanceof Error ? error.message : "An unexpected error occurred while loading your library."}
          </p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="mt-6 inline-flex h-11 min-h-11 items-center justify-center rounded-xl bg-[#1F2440] px-6 text-sm font-semibold text-[#EDEFF7] border border-[#2A2F4A] hover:bg-[#1F2440]/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5EEAD4]/40"
          >
            Try Again
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-6 md:px-8 md:py-10 text-[#EDEFF7]">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight md:text-3xl text-[#EDEFF7]">
            My Skills
          </h1>
          <p className="mt-1 text-sm text-[#8B93B0]">
            Build your skills through guided learning paths.
          </p>
        </div>
        {skills.length > 0 && (
          <AddSkillDialog
            existingSkillNames={existingNames}
            triggerClassName="w-full sm:w-auto"
          />
        )}
      </div>

      {skills.length === 0 ? (
        /* Empty State */
        <div className="mt-12 flex flex-col items-center justify-center rounded-2xl border border-[#2A2F4A] bg-[#171B2E] p-8 py-16 text-center shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
          <div className="flex size-14 items-center justify-center rounded-full bg-[#5EEAD4]/10 text-[#5EEAD4]">
            <BookOpen className="size-6" />
          </div>
          <h2 className="mt-4 font-heading text-lg font-bold text-[#EDEFF7] md:text-xl">
            You haven&apos;t added a skill yet.
          </h2>
          <p className="mt-2 max-w-md text-sm text-[#8B93B0] leading-relaxed">
            Choose something you want to learn and we&apos;ll build a guided learning path for you.
          </p>
          <div className="mt-6">
            <AddSkillDialog
              existingSkillNames={existingNames}
              triggerText={
                <>
                  <Plus className="size-4" aria-hidden />
                  Add Your First Skill
                </>
              }
            />
          </div>
        </div>
      ) : (
        /* Active State */
        <>
          {/* Search Bar */}
          <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-[#8B93B0]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => startTransition(() => setSearchQuery(e.target.value))}
                placeholder="Search skills..."
                className={cn(
                  "h-11 w-full rounded-xl border border-[#2A2F4A] bg-[#171B2E] px-11 text-sm text-[#EDEFF7]",
                  "placeholder:text-[#8B93B0]/50",
                  "focus-visible:border-[#5EEAD4] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#5EEAD4]/25",
                  "transition-all",
                )}
              />
            </div>
          </div>

          {/* Cards Grid */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
          >
            <AnimatePresence mode="popLayout">
              {filteredSkills.map((skill) => {
                const isGenerating = skill.generationStatus === "generating";
                const isFailed = skill.generationStatus === "failed";
                const isReady = skill.generationStatus === "ready";

                return (
                  <motion.div
                    key={skill.id}
                    variants={cardVariants}
                    layoutId={`skill-card-${skill.id}`}
                    className={cn(
                      "relative flex flex-col justify-between overflow-hidden rounded-2xl border border-[#2A2F4A] bg-[#171B2E] p-5 md:p-6 transition-all group",
                      isReady && "hover:border-[#5EEAD4]/40 hover:shadow-[0_0_24px_rgba(94,234,212,0.12)]",
                      isFailed && "hover:border-[#FB7185]/40 hover:shadow-[0_0_24px_rgba(251,113,133,0.08)]",
                    )}
                  >
                    <div>
                      {/* Title & Status Badge */}
                      <div className="flex items-start justify-between gap-3">
                        <Link href={`/skills/${skill.id}`} className="focus-visible:outline-none group">
                          <h2 className="font-heading text-lg font-bold tracking-tight text-[#EDEFF7] transition-colors group-hover:text-[#5EEAD4] focus-visible:underline">
                            {skill.name}
                          </h2>
                        </Link>
                        {isGenerating && (
                          <span className="inline-flex shrink-0 items-center rounded-full bg-[#5EEAD4]/10 px-2.5 py-0.5 text-[11px] font-semibold text-[#5EEAD4] animate-pulse">
                            Generating
                          </span>
                        )}
                        {isFailed && (
                          <span className="inline-flex shrink-0 items-center rounded-full bg-[#FB7185]/10 px-2.5 py-0.5 text-[11px] font-semibold text-[#FB7185]">
                            Failed
                          </span>
                        )}
                      </div>

                      {/* Description */}
                      <p className="mt-2 text-[13px] leading-relaxed text-[#8B93B0] line-clamp-2 min-h-[40px] break-words">
                        {skill.description || (isGenerating ? "Preparing your learning path layout..." : "No description provided.")}
                      </p>
                    </div>

                    {/* Progress Section */}
                    <div className="mt-6 space-y-3">
                      {isReady && (
                        <>
                          <div className="flex justify-between text-xs font-semibold text-[#8B93B0]">
                            <span>
                              {skill.progress.completedSubtopics} / {skill.progress.totalSubtopics} lessons completed
                            </span>
                            <span className="text-[#5EEAD4]">{skill.progress.percentComplete}%</span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-[#1F2440] overflow-hidden">
                            <div
                              className="h-full rounded-full bg-[#5EEAD4] transition-all duration-500 ease-out"
                              style={{ width: `${skill.progress.percentComplete}%` }}
                            />
                          </div>
                        </>
                      )}

                      {isGenerating && (
                        <div className="flex items-center gap-2 rounded-xl bg-[#1F2440]/40 px-3 py-2.5 border border-[#2A2F4A]/60">
                          <Loader2 className="size-4 animate-spin text-[#5EEAD4]" />
                          <span className="text-xs font-medium text-[#8B93B0] animate-pulse">
                            Your learning path is being prepared.
                          </span>
                        </div>
                      )}

                      {isFailed && (
                        <div className="flex items-center gap-2 rounded-xl bg-[#FB7185]/5 px-3 py-2.5 border border-[#FB7185]/10">
                          <AlertCircle className="size-4 text-[#FB7185]" />
                          <span className="text-xs font-medium text-[#FB7185]">
                            Lesson outline failed to generate.
                          </span>
                        </div>
                      )}

                      {/* Current Lesson / Status Indicator */}
                      {isReady && skill.currentSubtopic && (
                        <p className="text-xs font-medium text-[#8B93B0] truncate">
                          <span className="text-[#5EEAD4] font-semibold">
                            {skill.progress.percentComplete > 0 ? "Resume: " : "Start: "}
                          </span>
                          {skill.currentSubtopic.title}
                        </p>
                      )}

                      {/* Metadata row */}
                      <div className="flex items-center justify-between text-[11px] text-[#8B93B0] pt-1">
                        <div className="flex items-center gap-1">
                          <Calendar className="size-3" />
                          <span>Added {formatRelativeTime(skill.createdAt)}</span>
                        </div>
                        {skill.lastActivityAt && (
                          <span>Active {formatRelativeTime(skill.lastActivityAt)}</span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="mt-4 flex gap-3 pt-1">
                        <Link
                          href={`/skills/${skill.id}`}
                          className={cn(
                            "flex-1 inline-flex h-10 items-center justify-center rounded-xl",
                            "border border-[#2A2F4A] bg-[#1F2440]/30 text-xs font-semibold text-[#EDEFF7]",
                            "transition-all hover:bg-white/[0.04] hover:text-[#5EEAD4]",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5EEAD4]/40",
                          )}
                        >
                          View Path
                        </Link>
                        {isReady ? (
                          <Link
                            href={
                              skill.currentSubtopic
                                ? `/subtopics/${skill.currentSubtopic.id}`
                                : `/skills/${skill.id}`
                            }
                            className={cn(
                              "flex-1 inline-flex h-10 items-center justify-center rounded-xl",
                              "bg-[#5EEAD4] text-xs font-semibold text-[#0E1220]",
                              "shadow-[0_0_12px_rgba(94,234,212,0.15)]",
                              "transition-all hover:bg-[#5EEAD4]/90 hover:shadow-[0_0_20px_rgba(94,234,212,0.25)]",
                              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5EEAD4]/40",
                            )}
                          >
                            Continue Learning
                          </Link>
                        ) : (
                          <button
                            disabled
                            className={cn(
                              "flex-1 inline-flex h-10 items-center justify-center rounded-xl text-xs font-semibold",
                              "bg-[#2A2F4A] text-[#8B93B0] cursor-not-allowed",
                            )}
                          >
                            {isGenerating ? "Preparing..." : "Unavailable"}
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
          {filteredSkills.length === 0 && searchQuery && (
            <div className="mt-12 text-center text-[#8B93B0]">
              <p className="text-sm">No skills matched your search query.</p>
            </div>
          )}
        </>
      )}
    </main>
  );
}
