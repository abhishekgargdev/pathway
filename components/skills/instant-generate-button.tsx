"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Sparkles, Zap } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

type InstantGenerateButtonProps = {
  skillId: string;
  generationStatus?: "generating" | "ready" | "failed" | string;
  showIfReady?: boolean;
  className?: string;
  variant?: "primary" | "secondary" | "compact";
  onSuccess?: () => void;
};

async function triggerInstantGeneration(skillId: string) {
  const res = await fetch(`/api/skills/${skillId}/generate-instant`, {
    method: "POST",
  });

  const data = (await res.json().catch(() => ({}))) as {
    error?: string;
    message?: string;
  };

  if (!res.ok) {
    throw new Error(data.error ?? "Failed to generate instant content");
  }

  return data;
}

export function InstantGenerateButton({
  skillId,
  generationStatus,
  showIfReady = false,
  className,
  variant = "primary",
  onSuccess,
}: InstantGenerateButtonProps) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: triggerInstantGeneration,
    onMutate: () => {
      setError(null);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["skills"] }),
        queryClient.invalidateQueries({ queryKey: ["skill-tree", skillId] }),
      ]);
      if (onSuccess) onSuccess();
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Failed to generate content");
    },
  });

  const isGenerating = mutation.isPending;

  // Hide button if skill is already ready and showIfReady is false
  if (generationStatus === "ready" && !showIfReady && !isGenerating) {
    return null;
  }

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    mutation.mutate(skillId);
  }

  if (variant === "compact") {
    return (
      <div className="inline-flex flex-col items-end gap-1">
        <button
          type="button"
          onClick={handleClick}
          disabled={isGenerating}
          title="Generate lessons and quizzes instantly"
          className={cn(
            "inline-flex h-8 min-h-8 items-center justify-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold",
            "border border-[#FBBF24]/30 bg-[#FBBF24]/10 text-[#FBBF24]",
            "transition-colors hover:bg-[#FBBF24]/20",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FBBF24]/40",
            "disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
        >
          {isGenerating ? (
            <>
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
              <span>Generating...</span>
            </>
          ) : (
            <>
              <Zap className="size-3.5 fill-[#FBBF24]" aria-hidden />
              <span>Generate Instantly</span>
            </>
          )}
        </button>
        {error ? <span className="text-[10px] text-[#FB7185]">{error}</span> : null}
      </div>
    );
  }

  if (variant === "secondary") {
    return (
      <div className="flex flex-col items-start gap-1">
        <button
          type="button"
          onClick={handleClick}
          disabled={isGenerating}
          className={cn(
            "inline-flex h-10 min-h-10 items-center justify-center gap-2 rounded-xl px-4 text-xs font-semibold",
            "border border-[#FBBF24]/35 bg-[#FBBF24]/10 text-[#FBBF24]",
            "shadow-[0_0_16px_rgba(251,191,36,0.15)]",
            "transition-colors hover:bg-[#FBBF24]/20",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FBBF24]/40",
            "disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
        >
          {isGenerating ? (
            <>
              <Loader2 className="size-4 animate-spin text-[#FBBF24]" aria-hidden />
              <span>Generating lessons instantly...</span>
            </>
          ) : (
            <>
              <Sparkles className="size-4 text-[#FBBF24]" aria-hidden />
              <span>Generate Content Instantly</span>
            </>
          )}
        </button>
        {error ? <span className="text-xs text-[#FB7185]">{error}</span> : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={isGenerating}
        className={cn(
          "inline-flex h-10 min-h-10 items-center justify-center gap-2 rounded-xl px-4 text-xs font-semibold",
          "bg-gradient-to-r from-[#FBBF24] to-[#5EEAD4] text-[#0E1220]",
          "shadow-[0_0_20px_rgba(251,191,36,0.25)]",
          "transition-opacity hover:opacity-90",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FBBF24]/40",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
      >
        {isGenerating ? (
          <>
            <Loader2 className="size-4 animate-spin text-[#0E1220]" aria-hidden />
            <span>Building lessons & quizzes now...</span>
          </>
        ) : (
          <>
            <Zap className="size-4 fill-[#0E1220]" aria-hidden />
            <span>Start Learning Instantly</span>
          </>
        )}
      </button>
      {error ? <span className="text-xs text-[#FB7185]">{error}</span> : null}
    </div>
  );
}
