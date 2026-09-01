"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Edit3 } from "lucide-react";
import { useEffect, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type EditSkillDialogProps = {
  skillId: string;
  initialName: string;
  initialDescription?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
};

async function updateSkill(params: {
  skillId: string;
  name: string;
  description: string;
}) {
  const res = await fetch(`/api/skills/${params.skillId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: params.name,
      description: params.description,
    }),
  });

  const data = (await res.json().catch(() => ({}))) as {
    error?: string;
    skill?: { id: string; name: string; description: string };
  };

  if (!res.ok) {
    throw new Error(data.error ?? "Failed to update skill");
  }

  return data;
}

export function EditSkillDialog({
  skillId,
  initialName,
  initialDescription = "",
  open,
  onOpenChange,
  onSuccess,
}: EditSkillDialogProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(initialName);
      setDescription(initialDescription ?? "");
      setError(null);
    }
  }, [open, initialName, initialDescription]);

  const mutation = useMutation({
    mutationFn: updateSkill,
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
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Something went wrong");
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Skill name cannot be empty.");
      return;
    }
    mutation.mutate({
      skillId,
      name: trimmedName,
      description: description.trim(),
    });
  }

  const isSaving = mutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={!isSaving}
        className={cn(
          "max-w-[calc(100%-2.5rem)] gap-0 overflow-hidden rounded-2xl border border-[#2A2F4A] bg-[#171B2E] p-0 text-[#EDEFF7] sm:max-w-md",
          "shadow-[0_16px_48px_rgba(0,0,0,0.45)] ring-0",
        )}
      >
        <form onSubmit={handleSubmit}>
          <DialogHeader className="gap-2 px-5 pt-5 pb-4 md:px-6">
            <DialogTitle className="flex items-center gap-2 font-heading text-lg font-bold text-[#EDEFF7]">
              <Edit3 className="size-5 text-[#5EEAD4]" aria-hidden />
              Edit Skill
            </DialogTitle>
            <DialogDescription className="text-sm text-[#8B93B0]">
              Update the name or description of this skill path.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 px-5 pb-2 md:px-6">
            <div className="flex flex-col gap-2">
              <Label
                htmlFor="edit-skill-name"
                className="text-xs font-medium tracking-[0.5px] text-[#8B93B0] uppercase"
              >
                Skill Name
              </Label>
              <Input
                id="edit-skill-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. React & Next.js"
                maxLength={120}
                className={cn(
                  "h-11 min-h-11 rounded-xl border-[#2A2F4A] bg-[#1F2440] px-4 text-[15px] text-[#EDEFF7]",
                  "placeholder:text-[#8B93B0]/70",
                  "focus-visible:border-[#5EEAD4] focus-visible:ring-[3px] focus-visible:ring-[#5EEAD4]/25",
                  error && "border-[#FB7185]/60 aria-invalid:border-[#FB7185]",
                )}
                disabled={isSaving}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label
                htmlFor="edit-skill-desc"
                className="text-xs font-medium tracking-[0.5px] text-[#8B93B0] uppercase"
              >
                Description (Optional)
              </Label>
              <Textarea
                id="edit-skill-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what you want to learn in this skill..."
                rows={3}
                maxLength={2000}
                className={cn(
                  "min-h-20 rounded-xl border-[#2A2F4A] bg-[#1F2440] p-3 text-[14px] leading-relaxed text-[#EDEFF7] resize-y",
                  "placeholder:text-[#8B93B0]/70",
                  "focus-visible:border-[#5EEAD4] focus-visible:ring-[3px] focus-visible:ring-[#5EEAD4]/25",
                )}
                disabled={isSaving}
              />
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
              disabled={isSaving}
              className="inline-flex h-11 min-h-11 items-center justify-center rounded-xl border border-[#2A2F4A] bg-[#171B2E] px-4 text-sm font-medium text-[#8B93B0] transition-colors hover:text-[#EDEFF7]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !name.trim()}
              className={cn(
                "inline-flex h-11 min-h-11 items-center justify-center gap-2 rounded-xl px-5",
                "bg-[#5EEAD4] font-heading text-sm font-semibold text-[#0E1220]",
                "shadow-[0_0_20px_rgba(94,234,212,0.25)]",
                "hover:bg-[#5EEAD4]/90",
                "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#5EEAD4]/35",
                "disabled:cursor-not-allowed disabled:bg-[#2A2F4A] disabled:text-[#8B93B0] disabled:shadow-none",
              )}
            >
              {isSaving ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  Saving...
                </>
              ) : (
                "Save changes"
              )}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
