"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type DeleteSkillDialogProps = {
  skillId: string;
  skillName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  redirectToDashboard?: boolean;
  onSuccess?: () => void;
};

async function deleteSkill(skillId: string) {
  const res = await fetch(`/api/skills/${skillId}`, {
    method: "DELETE",
  });

  const data = (await res.json().catch(() => ({}))) as {
    error?: string;
    message?: string;
  };

  if (!res.ok) {
    throw new Error(data.error ?? "Failed to delete skill");
  }

  return data;
}

export function DeleteSkillDialog({
  skillId,
  skillName,
  open,
  onOpenChange,
  redirectToDashboard = false,
  onSuccess,
}: DeleteSkillDialogProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: deleteSkill,
    onMutate: () => {
      setError(null);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["skill-tree", skillId] }),
      ]);
      onOpenChange(false);
      if (onSuccess) onSuccess();
      if (redirectToDashboard) {
        router.push("/dashboard");
      }
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Failed to delete skill");
    },
  });

  const isDeleting = mutation.isPending;

  function handleDelete() {
    mutation.mutate(skillId);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={!isDeleting}
        className={cn(
          "max-w-[calc(100%-2.5rem)] gap-0 overflow-hidden rounded-2xl border border-[#FB7185]/30 bg-[#171B2E] p-0 text-[#EDEFF7] sm:max-w-md",
          "shadow-[0_16px_48px_rgba(251,113,133,0.15)] ring-0",
        )}
      >
        <div className="flex flex-col gap-4 px-5 pt-6 pb-2 md:px-6">
          <DialogHeader className="gap-2 text-left">
            <div className="flex size-11 items-center justify-center rounded-2xl border border-[#FB7185]/30 bg-[#FB7185]/10">
              <AlertTriangle className="size-6 text-[#FB7185]" aria-hidden />
            </div>
            <DialogTitle className="mt-1 font-heading text-lg font-bold text-[#EDEFF7]">
              Delete Skill
            </DialogTitle>
            <DialogDescription className="text-sm text-[#8B93B0]">
              Are you sure you want to delete <span className="font-semibold text-[#EDEFF7]">"{skillName}"</span>?
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-xl border border-[#FB7185]/20 bg-[#FB7185]/5 p-3.5 text-xs leading-relaxed text-[#FB7185]">
            This action <span className="font-bold">cannot be undone</span>. All associated topics, subtopics, lesson content, quizzes, coding challenges, and learning progress will be permanently deleted.
          </div>

          {error ? (
            <p
              role="alert"
              className="rounded-xl border border-[#FB7185]/30 bg-[#FB7185]/10 px-3 py-2.5 text-sm text-[#FB7185]"
            >
              {error}
            </p>
          ) : null}
        </div>

        <DialogFooter className="mt-4 gap-2 border-t border-[#2A2F4A] bg-[#1F2440]/50 px-5 py-4 sm:justify-end md:px-6">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
            className="inline-flex h-11 min-h-11 items-center justify-center rounded-xl border border-[#2A2F4A] bg-[#171B2E] px-4 text-sm font-medium text-[#8B93B0] transition-colors hover:text-[#EDEFF7]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className={cn(
              "inline-flex h-11 min-h-11 items-center justify-center gap-2 rounded-xl px-5",
              "bg-[#FB7185] font-heading text-sm font-semibold text-[#0E1220]",
              "shadow-[0_0_20px_rgba(251,113,133,0.3)]",
              "hover:bg-[#FB7185]/90",
              "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#FB7185]/35",
              "disabled:cursor-not-allowed disabled:bg-[#2A2F4A] disabled:text-[#8B93B0] disabled:shadow-none",
            )}
          >
            {isDeleting ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="size-4" aria-hidden />
                Delete skill
              </>
            )}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
