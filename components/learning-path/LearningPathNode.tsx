"use client";

import { motion } from "framer-motion";
import { AlertCircle, Check, Lock, Loader2, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";

export type NodeState =
  | "locked"
  | "available"
  | "in-progress"
  | "completed"
  | "generating"
  | "failed";

export type SubtopicNodeData = {
  id: string;
  title: string;
  order: number;
  status: "pending" | "generating" | "ready" | "failed";
  progressStatus: "not-started" | "in-progress" | "completed" | null;
  nodeState: NodeState;
  href: string | null;
  queueItemId?: string | null;
};

type LearningPathNodeProps = {
  subtopic: SubtopicNodeData;
  isLast: boolean;
  onRefresh?: () => void;
};

export function LearningPathNode({
  subtopic,
  isLast,
  onRefresh,
}: LearningPathNodeProps) {
  const { title, nodeState, href, queueItemId } = subtopic;
  const [isRetrying, setIsRetrying] = useState(false);

  async function handleRetry(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!queueItemId || isRetrying) return;

    setIsRetrying(true);
    try {
      const res = await fetch("/api/manage/regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ queueItemId }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to trigger regeneration");
      }
      toast.success("Regeneration requested. Refreshing path...");
      onRefresh?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Regeneration failed.");
    } finally {
      setIsRetrying(false);
    }
  }

  // Node styles configuration
  const config = {
    locked: {
      dotBg: "bg-transparent border-[#2A2F4A]",
      dotIcon: <Lock className="size-2.5 text-[#8B93B0]" />,
      cardBorder: "border-[#2A2F4A]",
      cardBg: "bg-[#171B2E]/40",
      textMuted: true,
      glow: "",
    },
    generating: {
      dotBg: "bg-[#1F2440] border-[#5EEAD4]/30",
      dotIcon: <Loader2 className="size-2.5 text-[#5EEAD4] animate-spin" />,
      cardBorder: "border-[#5EEAD4]/20",
      cardBg: "bg-[#171B2E]/70 animate-pulse",
      textMuted: false,
      glow: "",
    },
    failed: {
      dotBg: "bg-[#FB7185]/10 border-[#FB7185]",
      dotIcon: <AlertCircle className="size-2.5 text-[#FB7185]" />,
      cardBorder: "border-[#FB7185]/35",
      cardBg: "bg-[#FB7185]/5",
      textMuted: false,
      glow: "shadow-[0_0_12px_rgba(251,113,133,0.15)]",
    },
    completed: {
      dotBg: "bg-[#5EEAD4] border-[#5EEAD4]",
      dotIcon: <Check className="size-2.5 stroke-[#0E1220] stroke-[3.5]" />,
      cardBorder: "border-[#2A2F4A]",
      cardBg: "bg-white/[0.02]",
      textMuted: true,
      glow: "",
    },
    "in-progress": {
      dotBg: "bg-[#5EEAD4] border-[#5EEAD4]",
      dotIcon: <span className="size-1 rounded-full bg-[#0E1220]" />,
      cardBorder: "border-[#5EEAD4]/35",
      cardBg: "bg-[#5EEAD4]/8",
      textMuted: false,
      glow: "shadow-[0_0_16px_rgba(94,234,212,0.4)]",
    },
    available: {
      dotBg: "bg-transparent border-[#5EEAD4]",
      dotIcon: null,
      cardBorder: "border-[#5EEAD4]/20",
      cardBg: "bg-[#171B2E]",
      textMuted: false,
      glow: "shadow-[0_0_8px_rgba(94,234,212,0.08)]",
    },
  }[nodeState];

  const canNavigate = href && nodeState !== "locked" && nodeState !== "generating" && nodeState !== "failed";
  const isCompleted = nodeState === "completed";
  const inProgress = nodeState === "in-progress";

  const cardContent = (
    <div
      className={cn(
        "rounded-xl border p-3.5 md:p-4 transition-all relative overflow-hidden",
        config.cardBg,
        config.cardBorder,
        config.glow,
        canNavigate && "hover:border-[#5EEAD4]/40 hover:bg-white/[0.04]",
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "font-heading text-sm font-medium tracking-tight text-[#EDEFF7] break-words",
              config.textMuted && "text-[#8B93B0] group-hover:text-[#EDEFF7] transition-colors",
            )}
          >
            {title}
          </p>
          {nodeState === "locked" && (
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.5px] text-[#8B93B0]">
              Locked · Complete previous lessons to unlock
            </p>
          )}
          {nodeState === "generating" && (
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.5px] text-[#5EEAD4] animate-pulse">
              Generating...
            </p>
          )}
          {nodeState === "failed" && (
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.5px] text-[#FB7185]">
              Generation failed
            </p>
          )}
          {inProgress && (
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.5px] text-[#5EEAD4]">
              Current Lesson
            </p>
          )}
        </div>

        {nodeState === "failed" && queueItemId && (
          <button
            type="button"
            onClick={handleRetry}
            disabled={isRetrying}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#FB7185]/35 bg-[#FB7185]/10 px-2.5 py-1 text-xs font-semibold text-[#FB7185]",
              "transition-colors hover:bg-[#FB7185]/20",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FB7185]/40",
              "disabled:cursor-not-allowed disabled:opacity-50",
            )}
          >
            <RefreshCw className={cn("size-3", isRetrying && "animate-spin")} />
            {isRetrying ? "Retrying..." : "Retry"}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex items-stretch group">
      {/* Connector Line Side */}
      <div className="flex w-10 shrink-0 flex-col items-center">
        {/* Node Dot Wrapper */}
        <motion.div
          whileHover={canNavigate ? { scale: 1.08 } : {}}
          transition={{ type: "spring", stiffness: 400, damping: 15 }}
          className={cn(
            "flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-all relative z-10",
            config.dotBg,
            nodeState === "available" && "group-hover:border-[#5EEAD4] group-hover:bg-[#5EEAD4]/10",
          )}
        >
          {config.dotIcon}
        </motion.div>

        {/* Vertical Line Connector */}
        {!isLast && (
          <div className="w-0.5 flex-1 relative min-h-[2.5rem]">
            {/* Background (Locked or base track) */}
            <div className="absolute inset-0 bg-[#2A2F4A]" />
            {/* Filled highlight line for Completed/In-Progress */}
            {isCompleted && (
              <motion.div
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ duration: 0.4 }}
                className="absolute inset-0 bg-[#5EEAD4] origin-top"
              />
            )}
            {inProgress && (
              <div className="absolute inset-0 bg-gradient-to-b from-[#5EEAD4] to-[#2A2F4A]" />
            )}
          </div>
        )}
      </div>

      {/* Interactive Card Side */}
      <div className={cn("ml-3 flex-1", !isLast && "pb-5")}>
        {canNavigate ? (
          <Link
            href={href!}
            className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5EEAD4]/40"
          >
            {cardContent}
          </Link>
        ) : (
          <div className={cn(nodeState === "locked" && "cursor-not-allowed select-none")}>
            {cardContent}
          </div>
        )}
      </div>
    </div>
  );
}
