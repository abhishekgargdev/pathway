"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle, Clock, Loader2, RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type QueueItem = {
  id: string;
  targetType: "topic-outline" | "subtopic-content" | "quiz" | "coding-challenge";
  targetId: string;
  skillId?: {
    id: string;
    name: string;
  };
  priority: number;
  status: "queued" | "processing" | "done" | "failed";
  attempts: number;
  lastError?: string;
  createdAt: string;
  completedAt?: string;
  targetName: string;
};

type QuotaLog = {
  keyIndex: number;
  configured: boolean;
  callsUsed: number;
  tokensUsed: number;
  limit: number;
  remaining: number;
};

type ManageData = {
  queue: QueueItem[];
  usage: QuotaLog[];
};

async function fetchManageData(): Promise<ManageData> {
  const res = await fetch("/api/manage/queue");
  if (!res.ok) {
    throw new Error("Failed to load queue data");
  }
  return res.json() as Promise<ManageData>;
}

async function regenerateQueueItem(queueItemId: string): Promise<void> {
  const res = await fetch("/api/manage/regenerate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ queueItemId }),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? "Failed to regenerate queue item");
  }
}

export function ManageView() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [confirmItem, setConfirmItem] = useState<string | null>(null);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["manage-queue"],
    queryFn: fetchManageData,
    refetchInterval: 15000, // auto-refetch every 15s for real-time status updates
  });

  const regenerateMutation = useMutation({
    mutationFn: regenerateQueueItem,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["manage-queue"] });
      toast.success("Queue item successfully reset to queued");
      setConfirmItem(null);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    },
  });

  if (isLoading) {
    return (
      <main className="mx-auto w-full max-w-5xl px-5 py-6 md:px-6 md:py-8 lg:px-8">
        <div className="flex h-64 flex-col items-center justify-center gap-4">
          <Loader2 className="size-8 animate-spin text-[#5EEAD4]" />
          <p className="text-sm text-[#8B93B0]">Loading Content Operations dashboard...</p>
        </div>
      </main>
    );
  }

  if (isError || !data) {
    return (
      <main className="mx-auto w-full max-w-5xl px-5 py-6 md:px-6 md:py-8 lg:px-8">
        <div className="rounded-2xl border border-[#FB7185]/30 bg-[#FB7185]/10 px-4 py-5">
          <p className="text-sm text-[#FB7185]">Couldn’t load management view.</p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="mt-3 inline-flex h-11 min-h-11 items-center rounded-xl bg-[#171B2E] px-4 text-sm text-[#EDEFF7] border border-[#2A2F4A] hover:bg-[#1F2440]"
          >
            Try again
          </button>
        </div>
      </main>
    );
  }

  const failures = data.queue.filter((item) => item.status === "failed" || item.lastError);
  const filteredQueue = data.queue.filter((item) => {
    if (statusFilter === "all") return true;
    return item.status === statusFilter;
  });

  const getTargetTypeLabel = (type: string) => {
    switch (type) {
      case "topic-outline":
        return "Topic Outline";
      case "subtopic-content":
        return "Subtopic Content";
      case "quiz":
        return "Quiz";
      case "coding-challenge":
        return "Coding Challenge";
      default:
        return type;
    }
  };

  const handleConfirmRegenerate = () => {
    if (confirmItem) {
      regenerateMutation.mutate(confirmItem);
    }
  };

  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-6 md:px-6 md:py-8 lg:px-8">
      {/* Header */}
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-[#EDEFF7]">
            Content Operations
          </h1>
          <p className="mt-1 text-sm text-[#8B93B0]">
            Monitor content generation pipelines and API key quota limits.
          </p>
        </div>
        <button
          onClick={() => void refetch()}
          disabled={isFetching}
          className="inline-flex h-10 min-h-10 items-center gap-2 rounded-xl border border-[#2A2F4A] bg-[#171B2E] px-4 text-xs font-semibold text-[#EDEFF7] hover:bg-[#1F2440] disabled:opacity-50 transition-colors"
        >
          {isFetching ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <RefreshCw className="size-3.5" />
          )}
          Refresh
        </button>
      </header>

      <div className="flex flex-col gap-6">
        {/* Gemini Keys Quota Limits */}
        <section>
          <h2 className="mb-3.5 font-heading text-sm font-semibold tracking-wider text-[#8B93B0] uppercase">
            API Quota Limits
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.usage.map((key) => {
              const pct = key.limit > 0 ? (key.callsUsed / key.limit) * 100 : 0;
              const isNearCap = key.callsUsed >= key.limit * 0.8;
              return (
                <div
                  key={key.keyIndex}
                  className="rounded-2xl border border-[#2A2F4A] bg-[#171B2E] p-4 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[11px] font-semibold tracking-wider text-[#8B93B0] uppercase">
                        Key #{key.keyIndex}
                      </span>
                      <span
                        className={cn(
                          "text-[10px] px-2 py-0.5 rounded-full font-bold",
                          key.configured
                            ? "bg-[#5EEAD4]/10 text-[#5EEAD4]"
                            : "bg-white/[0.04] text-[#8B93B0]",
                        )}
                      >
                        {key.configured ? "Active" : "Not Configured"}
                      </span>
                    </div>

                    {key.configured ? (
                      <>
                        <div className="mt-3 flex items-baseline justify-between">
                          <span className="text-xl font-mono font-bold text-[#EDEFF7]">
                            {key.callsUsed} / {key.limit}
                          </span>
                          <span className="text-[11px] text-[#8B93B0] font-medium uppercase">
                            Calls used
                          </span>
                        </div>
                        <div className="mt-2 h-2 w-full bg-[#2A2F4A] rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-300",
                              isNearCap ? "bg-[#FB7185]" : "bg-[#5EEAD4]",
                            )}
                            style={{ width: `${Math.min(100, pct)}%` }}
                          />
                        </div>
                        <div className="mt-3 flex items-center justify-between text-[11px] text-[#8B93B0] font-mono">
                          <span>Tokens: {key.tokensUsed.toLocaleString()}</span>
                          <span>{key.remaining} left</span>
                        </div>
                      </>
                    ) : (
                      <p className="mt-4 text-xs text-[#8B93B0] italic">
                        Not configured in environment variables.
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Recent Failures */}
        <section>
          <h2 className="mb-3.5 font-heading text-sm font-semibold tracking-wider text-[#8B93B0] uppercase">
            Recent Pipeline Failures ({failures.length})
          </h2>
          {failures.length > 0 ? (
            <div className="flex flex-col gap-3">
              {failures.slice(0, 10).map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-[#FB7185]/20 bg-[#171B2E] p-4 flex flex-col gap-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-[#FB7185]/10 px-2 py-0.5 text-[10px] font-bold text-[#FB7185] uppercase">
                          {getTargetTypeLabel(item.targetType)}
                        </span>
                        {item.skillId?.name && (
                          <span className="text-xs text-[#8B93B0] truncate">
                            {item.skillId.name}
                          </span>
                        )}
                      </div>
                      <h4 className="mt-1.5 font-semibold text-sm text-[#EDEFF7] truncate">
                        {item.targetName}
                      </h4>
                      <p className="text-xs text-[#8B93B0] mt-1 font-mono">
                        Attempts: {item.attempts}/3 · Created:{" "}
                        {new Date(item.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <button
                      onClick={() => setConfirmItem(item.id)}
                      className="shrink-0 h-8 min-h-8 rounded-lg border border-[#2A2F4A] bg-[#1F2440] px-3 text-xs text-[#EDEFF7] transition-colors hover:border-[#5EEAD4]/40 hover:text-[#5EEAD4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5EEAD4]/40"
                    >
                      Regenerate
                    </button>
                  </div>
                  {item.lastError && (
                    <pre className="p-3 bg-[#0E1220] rounded-xl text-xs text-[#FB7185] font-mono overflow-x-auto whitespace-pre-wrap break-all max-h-32 overflow-y-auto border border-[#FB7185]/10">
                      {item.lastError}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-[#2A2F4A] bg-[#171B2E] p-6 text-center">
              <p className="text-sm text-[#8B93B0]">No recent failures detected.</p>
            </div>
          )}
        </section>

        {/* Pipeline Queue List */}
        <section>
          <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="font-heading text-sm font-semibold tracking-wider text-[#8B93B0] uppercase">
              Pipeline Queue ({data.queue.length})
            </h2>

            {/* dense custom status tabs */}
            <div className="inline-flex rounded-xl bg-[#171B2E] p-1 border border-[#2A2F4A]">
              {["all", "queued", "processing", "done", "failed"].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setStatusFilter(filter)}
                  className={cn(
                    "rounded-lg px-2.5 py-1 text-xs font-semibold capitalize transition-all",
                    statusFilter === filter
                      ? "bg-[#1F2440] text-[#5EEAD4]"
                      : "text-[#8B93B0] hover:text-[#EDEFF7]",
                  )}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          {filteredQueue.length > 0 ? (
            <div className="overflow-x-auto rounded-2xl border border-[#2A2F4A] bg-[#171B2E]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#2A2F4A] text-[11px] font-semibold uppercase tracking-[0.5px] text-[#8B93B0] bg-[#1F2440]/25">
                    <th className="px-4 py-3">Target</th>
                    <th className="px-4 py-3 hidden md:table-cell">Type</th>
                    <th className="px-4 py-3 text-center">Priority</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-center">Attempts</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2A2F4A] text-xs">
                  {filteredQueue.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-4 py-3.5 max-w-[200px] sm:max-w-xs md:max-w-md">
                        <div className="truncate font-medium text-[#EDEFF7]">
                          {item.targetName}
                        </div>
                        {item.skillId?.name && (
                          <div className="text-[10px] text-[#8B93B0] truncate mt-0.5">
                            {item.skillId.name}
                          </div>
                        )}
                        <div className="md:hidden text-[10px] text-[#8B93B0] mt-1">
                          {getTargetTypeLabel(item.targetType)}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-[#8B93B0] font-medium hidden md:table-cell">
                        {getTargetTypeLabel(item.targetType)}
                      </td>
                      <td className="px-4 py-3.5 text-center font-mono font-medium text-[#EDEFF7]">
                        {item.priority}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <div className="inline-flex items-center justify-center">
                          {item.status === "done" && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-[#5EEAD4]/25 bg-[#5EEAD4]/10 px-2 py-0.5 text-[10px] font-bold text-[#5EEAD4]">
                              <CheckCircle className="size-2.5" />
                              Done
                            </span>
                          )}
                          {item.status === "failed" && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-[#FB7185]/25 bg-[#FB7185]/10 px-2 py-0.5 text-[10px] font-bold text-[#FB7185]">
                              <AlertTriangle className="size-2.5" />
                              Failed
                            </span>
                          )}
                          {item.status === "processing" && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-[#FBBF24]/25 bg-[#FBBF24]/10 px-2 py-0.5 text-[10px] font-bold text-[#FBBF24] animate-pulse">
                              <Loader2 className="size-2.5 animate-spin" />
                              Running
                            </span>
                          )}
                          {item.status === "queued" && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-[#2A2F4A] bg-[#1F2440] px-2 py-0.5 text-[10px] font-bold text-[#8B93B0]">
                              <Clock className="size-2.5" />
                              Queued
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-center font-mono text-[#8B93B0]">
                        {item.attempts} / 3
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <button
                          onClick={() => setConfirmItem(item.id)}
                          disabled={item.status === "processing"}
                          className="inline-flex h-8 min-h-8 w-8 items-center justify-center rounded-lg border border-[#2A2F4A] bg-[#1F2440] text-[#EDEFF7] transition-all hover:border-[#5EEAD4]/40 hover:text-[#5EEAD4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5EEAD4]/40 disabled:cursor-not-allowed disabled:opacity-30"
                          title="Regenerate this item"
                        >
                          <RefreshCw className="size-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-2xl border border-[#2A2F4A] bg-[#171B2E] p-10 text-center">
              <p className="text-sm text-[#8B93B0]">No queue items found for this filter.</p>
            </div>
          )}
        </section>
      </div>

      {/* Confirmation Modal */}
      <Dialog
        open={!!confirmItem}
        onOpenChange={(nextOpen) => {
          if (regenerateMutation.isPending) return;
          if (!nextOpen) setConfirmItem(null);
        }}
      >
        <DialogContent className="max-w-[calc(100%-2.5rem)] sm:max-w-md bg-[#171B2E] border border-[#2A2F4A] text-[#EDEFF7] rounded-2xl p-0 overflow-hidden shadow-[0_16px_48px_rgba(0,0,0,0.45)] ring-0">
          <DialogHeader className="px-5 pt-5 pb-4 md:px-6">
            <DialogTitle className="font-heading text-lg font-bold text-[#EDEFF7]">
              Confirm Reset & Regenerate
            </DialogTitle>
            <DialogDescription className="text-sm text-[#8B93B0]">
              Are you sure you want to regenerate this content? This resets its attempts to 0, sets status to queued, and resets the target content/subtopic outline back to pending.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2 border-t border-[#2A2F4A] bg-[#1F2440]/50 px-5 py-4 sm:justify-end md:px-6">
            <button
              onClick={() => setConfirmItem(null)}
              disabled={regenerateMutation.isPending}
              className="inline-flex h-10 min-h-10 items-center justify-center rounded-xl px-4 border border-[#2A2F4A] bg-[#1F2440] text-sm text-[#EDEFF7] hover:bg-white/[0.04] transition-colors focus-visible:outline-none disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmRegenerate}
              disabled={regenerateMutation.isPending}
              className="inline-flex h-10 min-h-10 items-center justify-center rounded-xl px-4 bg-[#FB7185] hover:bg-[#FB7185]/90 font-semibold text-sm text-[#0E1220] transition-colors focus-visible:outline-none disabled:opacity-50"
            >
              {regenerateMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 size-3 animate-spin" />
                  Resetting...
                </>
              ) : (
                "Confirm Reset"
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
