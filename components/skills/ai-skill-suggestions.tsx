"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Sparkles, Plus, Loader2, RefreshCw, CheckCircle2, TrendingUp, Compass, Layers } from "lucide-react";
import { toast } from "sonner";

import type { SkillSuggestionsResponse, SkillSuggestionItem } from "@/app/api/skills/suggestions/route";
import { cn } from "@/lib/utils";

export function AiSkillSuggestions({
  className,
  existingSkillNames = [],
}: {
  className?: string;
  existingSkillNames?: string[];
}) {
  const queryClient = useQueryClient();
  const [addingSkillName, setAddingSkillName] = useState<string | null>(null);
  const [addedSkills, setAddedSkills] = useState<Set<string>>(new Set());

  // Fetch current user skills from react-query cache if available
  const dashboardCache = queryClient.getQueryData<{ skills?: Array<{ name: string }> }>(["dashboard"]);
  const skillsCache = queryClient.getQueryData<{ skills?: Array<{ name: string }> }>(["skills"]);

  const allUserSkillNames = [
    ...existingSkillNames,
    ...(dashboardCache?.skills?.map((s) => s.name) ?? []),
    ...(skillsCache?.skills?.map((s) => s.name) ?? []),
    ...Array.from(addedSkills),
  ];

  const userSkillSet = new Set(
    allUserSkillNames.map((n) => n.toLowerCase().trim()),
  );

  const { data, isLoading, isRefetching, refetch, isError } = useQuery<SkillSuggestionsResponse>({
    queryKey: ["skill-suggestions"],
    queryFn: async () => {
      const res = await fetch("/api/skills/suggestions");
      if (!res.ok) {
        throw new Error("Failed to fetch AI suggestions");
      }
      return res.json();
    },
    staleTime: 1000 * 60 * 10, // 10 minutes cache
  });

  const addSkillMutation = useMutation({
    mutationFn: async (skillName: string) => {
      setAddingSkillName(skillName);
      const res = await fetch("/api/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: skillName }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to add skill");
      }
      return { json, skillName };
    },
    onSuccess: (_, skillName) => {
      toast.success(`Skill "${skillName}" added to your learning library!`);
      setAddedSkills((prev) => new Set(prev).add(skillName));
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["skills"] });
      queryClient.invalidateQueries({ queryKey: ["skill-suggestions"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to add skill");
    },
    onSettled: () => {
      setAddingSkillName(null);
    },
  });

  if (isError) return null;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-[#2A2F4A] bg-gradient-to-b from-[#1A1F36]/90 to-[#171B2E]/90 p-5 md:p-6 shadow-xl backdrop-blur-md transition-all",
        className,
      )}
    >
      {/* Background Accent Glow */}
      <div className="pointer-events-none absolute -top-24 -right-24 size-48 rounded-full bg-[#5EEAD4]/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 size-48 rounded-full bg-[#8B7CF6]/10 blur-3xl" />

      {/* Header Row */}
      <div className="relative flex items-center justify-between gap-4 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-[#5EEAD4]/30 bg-[#5EEAD4]/10 text-[#5EEAD4] shadow-[0_0_12px_rgba(94,234,212,0.2)]">
            <Sparkles className="size-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-heading text-base font-bold text-[#EDEFF7]">
                AI Recommended Skills
              </h3>
              {data?.isAiGenerated && (
                <span className="rounded-full bg-[#5EEAD4]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#5EEAD4]">
                  AI Powered
                </span>
              )}
            </div>
            <p className="text-xs text-[#8B93B0]">
              Personalized suggestions based on your learning path & industry trends
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => refetch()}
          disabled={isLoading || isRefetching}
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-xl border border-[#2A2F4A] bg-[#1F2440] text-[#8B93B0] transition-all hover:border-[#5EEAD4]/40 hover:text-[#5EEAD4] disabled:opacity-50"
          title="Refresh AI suggestions"
        >
          <RefreshCw className={cn("size-3.5", (isLoading || isRefetching) && "animate-spin text-[#5EEAD4]")} />
        </button>
      </div>

      {/* Content Grid */}
      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 pt-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-xl border border-[#2A2F4A]/50 bg-[#1F2440]/30"
            />
          ))}
        </div>
      ) : data?.suggestions && data.suggestions.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 pt-2">
          {data.suggestions.map((item: SkillSuggestionItem) => {
            const isAdding = addingSkillName === item.name;
            const isAdded =
              addedSkills.has(item.name) ||
              userSkillSet.has(item.name.toLowerCase().trim());

            return (
              <div
                key={item.name}
                className="group relative flex flex-col justify-between rounded-xl border border-[#2A2F4A] bg-[#1F2440]/50 p-4 transition-all hover:border-[#5EEAD4]/40 hover:bg-[#1F2440]/80 hover:shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border",
                        item.category === "Next Step" && "bg-[#5EEAD4]/10 text-[#5EEAD4] border-[#5EEAD4]/30",
                        item.category === "Complementary" && "bg-[#8B7CF6]/10 text-[#8B7CF6] border-[#8B7CF6]/30",
                        item.category === "Trending" && "bg-[#FBBF24]/10 text-[#FBBF24] border-[#FBBF24]/30",
                      )}
                    >
                      {item.category === "Next Step" && <Compass className="size-3" />}
                      {item.category === "Complementary" && <Layers className="size-3" />}
                      {item.category === "Trending" && <TrendingUp className="size-3" />}
                      {item.category}
                    </span>
                  </div>

                  <h4 className="mt-2 font-heading text-sm font-bold text-[#EDEFF7] group-hover:text-[#5EEAD4] transition-colors">
                    {item.name}
                  </h4>

                  <p className="mt-1 text-xs text-[#8B93B0] leading-relaxed line-clamp-2">
                    {item.reason}
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-[#2A2F4A]/60 flex justify-end">
                  <button
                    type="button"
                    disabled={isAdding || isAdded}
                    onClick={() => addSkillMutation.mutate(item.name)}
                    className={cn(
                      "inline-flex h-7 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-all",
                      isAdded
                        ? "bg-[#5EEAD4]/15 text-[#5EEAD4] border border-[#5EEAD4]/30 cursor-default"
                        : "border border-[#2A2F4A] bg-[#171B2E] text-[#EDEFF7] hover:border-[#5EEAD4]/40 hover:text-[#5EEAD4] hover:bg-[#5EEAD4]/10 active:scale-95",
                    )}
                  >
                    {isAdding ? (
                      <>
                        <Loader2 className="size-3 animate-spin text-[#5EEAD4]" />
                        <span>Adding...</span>
                      </>
                    ) : isAdded ? (
                      <>
                        <CheckCircle2 className="size-3 text-[#5EEAD4]" />
                        <span>Added</span>
                      </>
                    ) : (
                      <>
                        <Plus className="size-3 text-[#5EEAD4]" />
                        <span>Add Skill</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="pt-2 text-xs text-[#8B93B0]">No recommendations right now.</p>
      )}
    </div>
  );
}
