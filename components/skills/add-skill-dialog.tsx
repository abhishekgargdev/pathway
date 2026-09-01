"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import type { CreateSkillResponse } from "@/lib/skills/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { getSkillSuggestions } from "@/lib/skills/suggestions";
import { cn } from "@/lib/utils";

async function createSkill(name: string): Promise<CreateSkillResponse> {
  const res = await fetch("/api/skills", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });

  const data = (await res.json().catch(() => ({}))) as {
    error?: string;
    skill?: CreateSkillResponse["skill"];
  };

  if (!res.ok) {
    throw new Error(data.error ?? "Failed to create skill");
  }

  return data as CreateSkillResponse;
}

type AddSkillDialogProps = {
  existingSkillNames?: string[];
  triggerClassName?: string;
  triggerText?: React.ReactNode;
};

export function AddSkillDialog({
  existingSkillNames = [],
  triggerClassName,
  triggerText,
}: AddSkillDialogProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const suggestions = useMemo(
    () =>
      getSkillSuggestions({
        query: name,
        exclude: existingSkillNames,
        limit: 6,
      }),
    [name, existingSkillNames],
  );

  const detectedSkillCount = useMemo(() => {
    if (!name.trim()) return 0;
    const names = name
      .split(/[\r\n,]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    return new Set(names.map((s) => s.toLowerCase())).size;
  }, [name]);

  const mutation = useMutation({
    mutationFn: createSkill,
    onMutate: () => {
      setError(null);
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setOpen(false);
      setName("");
      router.push(`/skills/${result.skill.id}`);
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Something went wrong");
    },
  });

  const generating = mutation.isPending;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Enter a skill name to continue.");
      return;
    }
    mutation.mutate(trimmed);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (generating) return;
        setOpen(next);
        if (!next) {
          setError(null);
          setName("");
        }
      }}
    >
      <DialogTrigger
        className={cn(
          "inline-flex h-11 min-h-11 items-center justify-center gap-2 rounded-xl px-4",
          "bg-[#5EEAD4] font-heading text-sm font-semibold text-[#0E1220]",
          "shadow-[0_0_24px_rgba(94,234,212,0.25)]",
          "transition-colors hover:bg-[#5EEAD4]/90",
          "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#5EEAD4]/35",
          triggerClassName,
        )}
      >
        {triggerText || (
          <>
            <Plus className="size-4" aria-hidden />
            Add skill
          </>
        )}
      </DialogTrigger>

      <DialogContent
        showCloseButton={!generating}
        className={cn(
          "max-w-[calc(100%-2.5rem)] gap-0 overflow-hidden rounded-2xl border border-[#2A2F4A] bg-[#171B2E] p-0 text-[#EDEFF7] sm:max-w-md",
          "shadow-[0_16px_48px_rgba(0,0,0,0.45)] ring-0",
        )}
      >
        {generating ? (
          <div className="flex flex-col items-center gap-4 px-6 py-10 text-center">
            <div className="relative flex size-14 items-center justify-center">
              <span className="absolute inset-0 rounded-full bg-[#5EEAD4]/15" />
              <Loader2
                className="relative size-7 animate-spin text-[#5EEAD4]"
                aria-hidden
              />
            </div>
            <div>
              <p className="font-heading text-lg font-semibold text-[#EDEFF7]">
                Generating your path…
              </p>
              <p className="mt-2 text-sm text-[#8B93B0]">
                Building the topic outline now. Lessons and quizzes will fill in
                via the daily queue.
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <DialogHeader className="gap-2 px-5 pt-5 pb-4 md:px-6">
              <DialogTitle className="font-heading text-lg font-bold text-[#EDEFF7]">
                Add skills
              </DialogTitle>
              <DialogDescription className="text-sm text-[#8B93B0]">
                Enter or paste one or more skills (comma or line-break separated). Pathway will analyze their learning dependencies, order them logically, and generate your learning paths in the background.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-4 px-5 pb-2 md:px-6">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="skill-name"
                    className="text-xs font-medium tracking-[0.5px] text-[#8B93B0] uppercase"
                  >
                    Skill name(s)
                  </Label>
                  {detectedSkillCount > 0 ? (
                    <span className="rounded-full bg-[#5EEAD4]/10 px-2 py-0.5 text-[11px] font-semibold text-[#5EEAD4]">
                      {detectedSkillCount} {detectedSkillCount === 1 ? "skill" : "skills"} detected
                    </span>
                  ) : null}
                </div>
                <Textarea
                  id="skill-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. HTML, CSS, JavaScript, React (or paste list with newlines/commas)"
                  rows={4}
                  maxLength={10000}
                  className={cn(
                    "min-h-24 max-h-48 rounded-xl border-[#2A2F4A] bg-[#1F2440] p-3 text-[14px] leading-relaxed text-[#EDEFF7] resize-y",
                    "placeholder:text-[#8B93B0]/70",
                    "focus-visible:border-[#5EEAD4] focus-visible:ring-[3px] focus-visible:ring-[#5EEAD4]/25",
                    error &&
                      "border-[#FB7185]/60 aria-invalid:border-[#FB7185]",
                  )}
                  aria-invalid={!!error}
                />
              </div>

              {suggestions.length > 0 ? (
                <div>
                  <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.5px] text-[#8B93B0] uppercase">
                    <Sparkles className="size-3 text-[#5EEAD4]" aria-hidden />
                    Suggested
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {suggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => {
                          setName(suggestion);
                          setError(null);
                        }}
                        className={cn(
                          "inline-flex min-h-9 items-center rounded-full border border-[#2A2F4A] bg-[#1F2440] px-3 py-1.5",
                          "text-xs font-medium text-[#EDEFF7]",
                          "transition-colors hover:border-[#5EEAD4]/40 hover:text-[#5EEAD4]",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5EEAD4]/40",
                          name.trim().toLowerCase() ===
                            suggestion.toLowerCase() &&
                            "border-[#5EEAD4]/50 bg-[#5EEAD4]/10 text-[#5EEAD4]",
                        )}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {error ? (
                <p
                  role="alert"
                  className="rounded-xl border border-[#FB7185]/30 bg-[#FB7185]/10 px-3 py-2.5 text-sm text-[#FB7185]"
                >
                  {error}
                </p>
              ) : null}
            </div>

            <DialogFooter className="mt-4 gap-2 border-t border-[#2A2F4A] bg-[#1F2440]/50 px-5 py-4 sm:justify-stretch md:px-6">
              <button
                type="submit"
                disabled={!name.trim()}
                className={cn(
                  "inline-flex h-11 min-h-11 w-full items-center justify-center rounded-xl",
                  "bg-[#5EEAD4] font-heading text-sm font-semibold text-[#0E1220]",
                  "shadow-[0_0_20px_rgba(94,234,212,0.25)]",
                  "hover:bg-[#5EEAD4]/90",
                  "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#5EEAD4]/35",
                  "disabled:cursor-not-allowed disabled:bg-[#2A2F4A] disabled:text-[#8B93B0] disabled:shadow-none",
                )}
              >
                {detectedSkillCount > 1
                  ? `Generate ${detectedSkillCount} learning paths`
                  : "Generate path"}
              </button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
