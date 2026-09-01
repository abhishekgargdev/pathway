"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ChevronLeft, ChevronRight, Edit3, Search, SlidersHorizontal, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { StreakCounter } from "@/components/dashboard/streak-counter";
import { AddSkillDialog } from "@/components/skills/add-skill-dialog";
import { AiSkillSuggestions } from "@/components/skills/ai-skill-suggestions";
import { DeleteSkillDialog } from "@/components/skills/delete-skill-dialog";
import { EditSkillDialog } from "@/components/skills/edit-skill-dialog";
import { InstantGenerateButton } from "@/components/skills/instant-generate-button";
import type { DashboardResponse } from "@/lib/dashboard/types";
import { cn } from "@/lib/utils";

type DashboardStatusFilter = "all" | "in_progress" | "completed" | "new";
type DashboardSortBy = "newest" | "alphabetical" | "progress_desc" | "progress_asc";

const DASHBOARD_ITEMS_PER_PAGE = 5;

async function fetchDashboard(): Promise<DashboardResponse> {
  const res = await fetch("/api/dashboard");
  if (!res.ok) {
    throw new Error("Failed to load dashboard");
  }
  return res.json() as Promise<DashboardResponse>;
}

export function DashboardView() {
  const [editingSkill, setEditingSkill] = useState<{ id: string; name: string; description?: string } | null>(null);
  const [deletingSkill, setDeletingSkill] = useState<{ id: string; name: string } | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<DashboardStatusFilter>("all");
  const [sortBy, setSortBy] = useState<DashboardSortBy>("newest");
  const [currentPage, setCurrentPage] = useState(1);

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

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  const handleFilterChange = (filter: DashboardStatusFilter) => {
    setStatusFilter(filter);
    setCurrentPage(1);
  };

  const handleSortChange = (sort: DashboardSortBy) => {
    setSortBy(sort);
    setCurrentPage(1);
  };

  const filteredSkills = skills.filter((skill) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      skill.name.toLowerCase().includes(q) ||
      (skill.description && skill.description.toLowerCase().includes(q));

    if (!matchesSearch) return false;

    if (statusFilter === "in_progress") return skill.percentComplete > 0 && skill.percentComplete < 100;
    if (statusFilter === "completed") return skill.percentComplete === 100;
    if (statusFilter === "new") return skill.isNew;

    return true;
  });

  const sortedSkills = [...filteredSkills].sort((a, b) => {
    if (sortBy === "alphabetical") return a.name.localeCompare(b.name);
    if (sortBy === "progress_desc") return b.percentComplete - a.percentComplete;
    if (sortBy === "progress_asc") return a.percentComplete - b.percentComplete;
    return 0;
  });

  const totalItems = sortedSkills.length;
  const totalPages = Math.ceil(totalItems / DASHBOARD_ITEMS_PER_PAGE) || 1;
  const validPage = Math.min(Math.max(currentPage, 1), totalPages);
  const paginatedSkills = sortedSkills.slice(
    (validPage - 1) * DASHBOARD_ITEMS_PER_PAGE,
    validPage * DASHBOARD_ITEMS_PER_PAGE,
  );

  const startItem = totalItems === 0 ? 0 : (validPage - 1) * DASHBOARD_ITEMS_PER_PAGE + 1;
  const endItem = Math.min(validPage * DASHBOARD_ITEMS_PER_PAGE, totalItems);

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

        {/* AI Recommended Skills Window */}
        <AiSkillSuggestions className="mt-6 mb-8" />

        {/* Active skills */}
        <section id="skills">
          <div className="mb-3.5 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-heading text-base font-semibold text-[#EDEFF7]">
              Active skills
            </h2>
            <AddSkillDialog
              existingSkillNames={skills.map((s) => s.name)}
              triggerClassName="h-10 min-h-10 px-3 text-xs shadow-[0_0_16px_rgba(94,234,212,0.2)]"
            />
          </div>

          {skills.length === 0 ? (
            <div className="rounded-2xl border border-[#2A2F4A] bg-[#171B2E] p-5 shadow-[0_4px_12px_rgba(0,0,0,0.2)]">
              <p className="text-sm text-[#EDEFF7]">No active skills yet.</p>
              <p className="mt-1 text-[13px] text-[#8B93B0]">
                Add a skill to generate your first learning path.
              </p>
              <div className="mt-4">
                <AddSkillDialog
                  existingSkillNames={[]}
                  triggerClassName="w-full sm:w-auto"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Filter Controls Bar */}
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                  {/* Search Bar */}
                  <div className="relative flex-1">
                    <Search className="absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-[#8B93B0]" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      placeholder="Search active skills..."
                      className="h-9 w-full rounded-xl border border-[#2A2F4A] bg-[#171B2E] pl-9 pr-8 text-xs text-[#EDEFF7] placeholder:text-[#8B93B0]/50 focus:border-[#5EEAD4] focus:outline-none"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => handleSearchChange("")}
                        className="absolute top-1/2 right-2.5 -translate-y-1/2 text-[#8B93B0] hover:text-[#EDEFF7]"
                      >
                        <X className="size-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Sort Selector */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <SlidersHorizontal className="size-3.5 text-[#8B93B0]" />
                    <select
                      value={sortBy}
                      onChange={(e) => handleSortChange(e.target.value as DashboardSortBy)}
                      className="h-9 rounded-xl border border-[#2A2F4A] bg-[#171B2E] px-2.5 text-[11px] font-semibold text-[#EDEFF7] focus:border-[#5EEAD4] focus:outline-none"
                    >
                      <option value="newest">Sort: Newest</option>
                      <option value="alphabetical">Sort: Name (A–Z)</option>
                      <option value="progress_desc">Sort: Progress (High→Low)</option>
                      <option value="progress_asc">Sort: Progress (Low→High)</option>
                    </select>
                  </div>
                </div>

                {/* Filter Tabs */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {[
                    { id: "all", label: "All" },
                    { id: "in_progress", label: "In Progress" },
                    { id: "completed", label: "Completed" },
                    { id: "new", label: "New" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => handleFilterChange(tab.id as DashboardStatusFilter)}
                      className={cn(
                        "rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all border",
                        statusFilter === tab.id
                          ? "border-[#5EEAD4]/50 bg-[#5EEAD4]/15 text-[#5EEAD4]"
                          : "border-[#2A2F4A] bg-[#1F2440]/40 text-[#8B93B0] hover:text-[#EDEFF7]",
                      )}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Skills List */}
              <div className="flex flex-col gap-3">
                {paginatedSkills.map((skill) => (
                  <div
                    key={skill.id}
                    className={cn(
                      "relative overflow-hidden rounded-2xl border border-[#2A2F4A] bg-[#171B2E] p-4",
                      "shadow-[0_4px_12px_rgba(0,0,0,0.2)]",
                      "transition-all hover:border-[#2A2F4A]/80",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <Link
                        href={`/skills/${skill.id}`}
                        className="min-w-0 flex-1 break-words font-heading text-sm font-medium text-[#EDEFF7] hover:text-[#5EEAD4] transition-colors"
                      >
                        {skill.name}
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
                          className="inline-flex size-7 items-center justify-center rounded-lg border border-[#2A2F4A] bg-[#1F2440] text-[#8B93B0] transition-colors hover:border-[#5EEAD4]/40 hover:text-[#5EEAD4]"
                          title="Edit skill"
                        >
                          <Edit3 className="size-3.5" aria-hidden />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setDeletingSkill({ id: skill.id, name: skill.name });
                          }}
                          className="inline-flex size-7 items-center justify-center rounded-lg border border-[#FB7185]/30 bg-[#FB7185]/10 text-[#FB7185] transition-colors hover:bg-[#FB7185]/20"
                          title="Delete skill"
                        >
                          <Trash2 className="size-3.5" aria-hidden />
                        </button>
                      </div>
                    </div>

                    <div className="mt-2 mb-3 flex flex-wrap items-center gap-2">
                      {skill.isNew ? (
                        <span className="rounded-full bg-[#FBBF24]/15 px-2 py-0.5 text-[10px] font-bold tracking-[0.5px] text-[#FBBF24]">
                          NEW
                        </span>
                      ) : null}
                      <InstantGenerateButton skillId={skill.id} variant="compact" />
                    </div>

                    <Link href={`/skills/${skill.id}`} className="block">
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
                  </div>
                ))}
              </div>

              {/* Empty Search Result */}
              {totalItems === 0 && (
                <div className="rounded-xl border border-dashed border-[#2A2F4A] p-4 text-center text-xs text-[#8B93B0]">
                  No active skills match your filters.
                </div>
              )}

              {/* Dashboard Pagination Footer */}
              {totalItems > 0 && (
                <div className="flex items-center justify-between pt-2">
                  <p className="text-[11px] text-[#8B93B0]">
                    Showing <span className="text-[#EDEFF7] font-semibold">{startItem}–{endItem}</span> of{" "}
                    <span className="text-[#EDEFF7] font-semibold">{totalItems}</span>
                  </p>

                  {totalPages > 1 && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={validPage === 1}
                        onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                        className="inline-flex size-7 items-center justify-center rounded-lg border border-[#2A2F4A] bg-[#171B2E] text-[#EDEFF7] hover:border-[#5EEAD4]/40 hover:text-[#5EEAD4] disabled:opacity-30"
                      >
                        <ChevronLeft className="size-3.5" />
                      </button>
                      <span className="text-[11px] font-semibold text-[#8B93B0] px-1">
                        {validPage} / {totalPages}
                      </span>
                      <button
                        type="button"
                        disabled={validPage === totalPages}
                        onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                        className="inline-flex size-7 items-center justify-center rounded-lg border border-[#2A2F4A] bg-[#171B2E] text-[#EDEFF7] hover:border-[#5EEAD4]/40 hover:text-[#5EEAD4] disabled:opacity-30"
                      >
                        <ChevronRight className="size-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              )}
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
