"use client";

import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  BookOpen,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Filter,
  Loader2,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";

import { AddSkillDialog } from "@/components/skills/add-skill-dialog";
import { AiSkillSuggestions } from "@/components/skills/ai-skill-suggestions";
import { DeleteSkillDialog } from "@/components/skills/delete-skill-dialog";
import { EditSkillDialog } from "@/components/skills/edit-skill-dialog";
import { InstantGenerateButton } from "@/components/skills/instant-generate-button";
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

type StatusFilterType = "all" | "ready" | "generating" | "failed" | "in_progress" | "completed";
type SortByType = "newest" | "oldest" | "alphabetical" | "progress_desc" | "progress_asc";

const ITEMS_PER_PAGE = 6;

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
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>("all");
  const [sortBy, setSortBy] = useState<SortByType>("newest");
  const [currentPage, setCurrentPage] = useState(1);

  const [editingSkill, setEditingSkill] = useState<{ id: string; name: string; description?: string } | null>(null);
  const [deletingSkill, setDeletingSkill] = useState<{ id: string; name: string } | null>(null);
  const [, startTransition] = useTransition();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["skills"],
    queryFn: fetchUserSkills,
  });

  const skills = data?.skills ?? [];

  // Reset pagination when search, filter, or sort changes
  const handleSearchChange = (query: string) => {
    startTransition(() => {
      setSearchQuery(query);
      setCurrentPage(1);
    });
  };

  const handleStatusFilterChange = (filter: StatusFilterType) => {
    setStatusFilter(filter);
    setCurrentPage(1);
  };

  const handleSortChange = (sort: SortByType) => {
    setSortBy(sort);
    setCurrentPage(1);
  };

  // Filter skills
  const filteredSkills = skills.filter((skill) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      skill.name.toLowerCase().includes(q) ||
      (skill.description && skill.description.toLowerCase().includes(q));

    if (!matchesSearch) return false;

    if (statusFilter === "ready") return skill.generationStatus === "ready";
    if (statusFilter === "generating") return skill.generationStatus === "generating";
    if (statusFilter === "failed") return skill.generationStatus === "failed";
    if (statusFilter === "in_progress")
      return skill.progress.percentComplete > 0 && skill.progress.percentComplete < 100;
    if (statusFilter === "completed") return skill.progress.percentComplete === 100;

    return true;
  });

  // Sort skills
  const sortedSkills = [...filteredSkills].sort((a, b) => {
    if (sortBy === "newest") {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    if (sortBy === "oldest") {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    }
    if (sortBy === "alphabetical") {
      return a.name.localeCompare(b.name);
    }
    if (sortBy === "progress_desc") {
      return b.progress.percentComplete - a.progress.percentComplete;
    }
    if (sortBy === "progress_asc") {
      return a.progress.percentComplete - b.progress.percentComplete;
    }
    return 0;
  });

  // Pagination calculation
  const totalItems = sortedSkills.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;
  const validCurrentPage = Math.min(Math.max(currentPage, 1), totalPages);
  const paginatedSkills = sortedSkills.slice(
    (validCurrentPage - 1) * ITEMS_PER_PAGE,
    validCurrentPage * ITEMS_PER_PAGE,
  );

  const startItem = totalItems === 0 ? 0 : (validCurrentPage - 1) * ITEMS_PER_PAGE + 1;
  const endItem = Math.min(validCurrentPage * ITEMS_PER_PAGE, totalItems);

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

      {/* AI Recommended Skills Window */}
      <AiSkillSuggestions className="mt-8 mb-6" existingSkillNames={existingNames} />

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
          {/* Controls Bar: Search, Status Filters, & Sort */}
          <div className="mt-6 flex flex-col gap-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              {/* Search Box */}
              <div className="relative flex-1">
                <Search className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-[#8B93B0]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Search skills by title or description..."
                  className={cn(
                    "h-11 w-full rounded-xl border border-[#2A2F4A] bg-[#171B2E] px-11 text-sm text-[#EDEFF7]",
                    "placeholder:text-[#8B93B0]/50",
                    "focus-visible:border-[#5EEAD4] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#5EEAD4]/25",
                    "transition-all",
                  )}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => handleSearchChange("")}
                    className="absolute top-1/2 right-3 -translate-y-1/2 p-1 text-[#8B93B0] hover:text-[#EDEFF7]"
                  >
                    <X className="size-4" />
                  </button>
                )}
              </div>

              {/* Sort Selector */}
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="size-4 text-[#8B93B0] shrink-0" />
                <select
                  value={sortBy}
                  onChange={(e) => handleSortChange(e.target.value as SortByType)}
                  className="h-11 rounded-xl border border-[#2A2F4A] bg-[#171B2E] px-3.5 text-xs font-semibold text-[#EDEFF7] focus-visible:border-[#5EEAD4] focus-visible:outline-none"
                >
                  <option value="newest">Sort by: Newest First</option>
                  <option value="oldest">Sort by: Oldest First</option>
                  <option value="alphabetical">Sort by: Name (A–Z)</option>
                  <option value="progress_desc">Sort by: Progress (High to Low)</option>
                  <option value="progress_asc">Sort by: Progress (Low to High)</option>
                </select>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {[
                { id: "all", label: "All Skills" },
                { id: "ready", label: "Ready" },
                { id: "in_progress", label: "In Progress" },
                { id: "completed", label: "Completed" },
                { id: "generating", label: "Generating" },
                { id: "failed", label: "Failed" },
              ].map((tab) => {
                const isActive = statusFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleStatusFilterChange(tab.id as StatusFilterType)}
                    className={cn(
                      "rounded-xl px-3 py-1.5 text-xs font-semibold transition-all border",
                      isActive
                        ? "border-[#5EEAD4]/50 bg-[#5EEAD4]/15 text-[#5EEAD4] shadow-[0_0_12px_rgba(94,234,212,0.15)]"
                        : "border-[#2A2F4A] bg-[#1F2440]/50 text-[#8B93B0] hover:border-[#2A2F4A]/80 hover:text-[#EDEFF7]",
                    )}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cards Grid */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
          >
            <AnimatePresence mode="popLayout">
              {paginatedSkills.map((skill) => {
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
                      {/* Top Header: Title & Edit/Delete Action Icons */}
                      <div className="flex items-start justify-between gap-3">
                        <Link href={`/skills/${skill.id}`} className="focus-visible:outline-none group min-w-0 flex-1">
                          <h2 className="font-heading text-lg font-bold tracking-tight text-[#EDEFF7] transition-colors group-hover:text-[#5EEAD4] break-words">
                            {skill.name}
                          </h2>
                        </Link>
                        <div className="flex shrink-0 items-center gap-1.5 pt-0.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setEditingSkill({
                                id: skill.id,
                                name: skill.name,
                                description: skill.description ?? "",
                              });
                            }}
                            className="inline-flex size-8 items-center justify-center rounded-xl border border-[#2A2F4A] bg-[#1F2440] text-[#8B93B0] transition-all hover:border-[#5EEAD4]/40 hover:text-[#5EEAD4] hover:bg-[#5EEAD4]/10"
                            title="Edit skill"
                          >
                            <Edit3 className="size-4" aria-hidden />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setDeletingSkill({ id: skill.id, name: skill.name });
                            }}
                            className="inline-flex size-8 items-center justify-center rounded-xl border border-[#FB7185]/30 bg-[#FB7185]/10 text-[#FB7185] transition-all hover:bg-[#FB7185]/20 hover:border-[#FB7185]/50"
                            title="Delete skill"
                          >
                            <Trash2 className="size-4" aria-hidden />
                          </button>
                        </div>
                      </div>

                      {/* Second Row: Status Badges & Instant Generate */}
                      <div className="mt-2.5 flex flex-wrap items-center gap-2">
                        {isGenerating && (
                          <span className="inline-flex items-center rounded-full bg-[#5EEAD4]/10 px-2.5 py-0.5 text-[11px] font-semibold text-[#5EEAD4] animate-pulse">
                            Generating
                          </span>
                        )}
                        {isFailed && (
                          <span className="inline-flex items-center rounded-full bg-[#FB7185]/10 px-2.5 py-0.5 text-[11px] font-semibold text-[#FB7185]">
                            Failed
                          </span>
                        )}
                        <InstantGenerateButton
                          skillId={skill.id}
                          generationStatus={skill.generationStatus}
                          variant="compact"
                        />
                      </div>

                      {/* Description */}
                      <p className="mt-3 text-[13px] leading-relaxed text-[#8B93B0] line-clamp-2 min-h-[40px] break-words">
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
                            "border border-[#5EEAD4]/40 bg-[#5EEAD4]/10 text-xs font-semibold text-[#5EEAD4]",
                            "transition-all hover:bg-[#5EEAD4]/20 hover:border-[#5EEAD4]",
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
                              "flex-1 inline-flex h-10 items-center justify-center rounded-xl text-xs font-semibold transition-all",
                              skill.progress.percentComplete > 0
                                ? "border border-[#8B7CF6]/40 bg-[#8B7CF6]/15 text-[#8B7CF6] hover:bg-[#8B7CF6]/25"
                                : "border border-[#2A2F4A] bg-[#1F2440] text-[#EDEFF7] hover:border-[#5EEAD4]/40 hover:text-[#5EEAD4]",
                            )}
                          >
                            {skill.progress.percentComplete > 0 ? "Continue" : "Start Learning"}
                          </Link>
                        ) : (
                          <button
                            type="button"
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

          {/* Empty Search / Filter Result State */}
          {totalItems === 0 && (
            <div className="mt-12 text-center text-[#8B93B0] py-8 border border-dashed border-[#2A2F4A] rounded-2xl">
              <p className="text-sm font-semibold text-[#EDEFF7]">No matching skills found.</p>
              <p className="mt-1 text-xs text-[#8B93B0]">Try adjusting your search query or filter selection.</p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("all");
                }}
                className="mt-4 inline-flex h-9 items-center justify-center rounded-xl border border-[#2A2F4A] bg-[#1F2440] px-4 text-xs font-semibold text-[#5EEAD4] hover:bg-[#1F2440]/80"
              >
                Clear Filters
              </button>
            </div>
          )}

          {/* Pagination Controls Footer */}
          {totalItems > 0 && (
            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-[#2A2F4A] bg-[#171B2E]/90 p-4 shadow-xl backdrop-blur-md">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-[#1F2440] px-3 py-1 text-xs font-semibold text-[#8B93B0] border border-[#2A2F4A]">
                  Showing <strong className="ml-1 text-[#EDEFF7]">{startItem}–{endItem}</strong>
                </span>
                <span className="text-xs text-[#8B93B0]">
                  of <strong className="text-[#EDEFF7]">{totalItems}</strong> skills
                </span>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={validCurrentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#2A2F4A] bg-[#1F2440] px-3 text-xs font-semibold text-[#EDEFF7] transition-all hover:border-[#5EEAD4]/40 hover:text-[#5EEAD4] disabled:opacity-30 disabled:hover:border-[#2A2F4A] disabled:hover:text-[#EDEFF7]"
                  >
                    <ChevronLeft className="size-4" />
                    <span>Prev</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        type="button"
                        onClick={() => setCurrentPage(page)}
                        className={cn(
                          "size-9 rounded-xl text-xs font-semibold transition-all border",
                          page === validCurrentPage
                            ? "border-[#5EEAD4] bg-[#5EEAD4]/15 text-[#5EEAD4] font-bold shadow-[0_0_12px_rgba(94,234,212,0.25)]"
                            : "border-[#2A2F4A] bg-[#1F2440]/50 text-[#8B93B0] hover:text-[#EDEFF7] hover:border-[#2A2F4A]/80",
                        )}
                      >
                        {page}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    disabled={validCurrentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#2A2F4A] bg-[#1F2440] px-3 text-xs font-semibold text-[#EDEFF7] transition-all hover:border-[#5EEAD4]/40 hover:text-[#5EEAD4] disabled:opacity-30 disabled:hover:border-[#2A2F4A] disabled:hover:text-[#EDEFF7]"
                  >
                    <span>Next</span>
                    <ChevronRight className="size-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {editingSkill ? (
        <EditSkillDialog
          skillId={editingSkill.id}
          initialName={editingSkill.name}
          initialDescription={editingSkill.description}
          open={!!editingSkill}
          onOpenChange={(open) => {
            if (!open) setEditingSkill(null);
          }}
        />
      ) : null}

      {deletingSkill ? (
        <DeleteSkillDialog
          skillId={deletingSkill.id}
          skillName={deletingSkill.name}
          open={!!deletingSkill}
          onOpenChange={(open) => {
            if (!open) setDeletingSkill(null);
          }}
        />
      ) : null}
    </main>
  );
}
