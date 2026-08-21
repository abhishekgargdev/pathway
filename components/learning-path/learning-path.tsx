import { Check } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type PathNodeState =
  | "locked"
  | "available"
  | "in-progress"
  | "completed";

export type PathNodeData = {
  id: string;
  label: string;
  state: PathNodeState;
  /** Optional secondary line (e.g. parent topic title) */
  subtitle?: string;
  /** 0–100, shown on in-progress nodes */
  progress?: number;
  href?: string | null;
};

const stateStyles: Record<
  PathNodeState,
  {
    fill: string;
    stroke: string;
    dim: boolean;
    cardBorder: string;
    cardBg: string;
  }
> = {
  completed: {
    fill: "bg-[#5EEAD4]",
    stroke: "border-[#5EEAD4]",
    dim: false,
    cardBorder: "border-[#2A2F4A]",
    cardBg: "bg-white/[0.03]",
  },
  "in-progress": {
    fill: "bg-[#5EEAD4]",
    stroke: "border-[#5EEAD4]",
    dim: false,
    cardBorder: "border-[#5EEAD4]/35",
    cardBg: "bg-[#5EEAD4]/10",
  },
  available: {
    fill: "bg-transparent",
    stroke: "border-[#5EEAD4]",
    dim: false,
    cardBorder: "border-[#5EEAD4]/15",
    cardBg: "bg-white/[0.03]",
  },
  locked: {
    fill: "bg-transparent",
    stroke: "border-[#2A2F4A]",
    dim: true,
    cardBorder: "border-[#2A2F4A]",
    cardBg: "bg-white/[0.03]",
  },
};

type PathNodeProps = {
  node: PathNodeData;
  isLast: boolean;
  compact?: boolean;
  connectorFrom?: PathNodeState;
  onNodeClick?: (node: PathNodeData) => void;
};

function NodeDot({ state }: { state: PathNodeState }) {
  const styles = stateStyles[state];
  const inProgress = state === "in-progress";

  return (
    <div
      className={cn(
        "flex size-5 shrink-0 items-center justify-center rounded-full border-2 md:size-6",
        styles.fill,
        styles.stroke,
        inProgress && "shadow-[0_0_16px_rgba(94,234,212,0.75)]",
        inProgress && "animate-path-pulse",
        state === "available" && "shadow-[0_0_10px_rgba(94,234,212,0.2)]",
      )}
      aria-hidden
    >
      {state === "completed" ? (
        <Check className="size-2.5 stroke-[#0E1220] stroke-[3] md:size-3" />
      ) : null}
      {inProgress ? (
        <span className="size-1.5 rounded-full bg-[#0E1220]" />
      ) : null}
    </div>
  );
}

function Connector({
  from,
  dim,
  compact,
}: {
  from: PathNodeState;
  dim: boolean;
  compact: boolean;
}) {
  const lit = from === "completed";
  const partial = from === "in-progress";

  return (
    <div
      className={cn(
        "relative w-0.5 flex-1 overflow-hidden rounded-full",
        compact ? "min-h-5" : "min-h-7 md:min-h-8",
        dim && "opacity-35",
      )}
      aria-hidden
    >
      <div className="absolute inset-0 bg-[#2A2F4A]" />
      {lit ? (
        <div className="absolute inset-0 origin-top animate-path-line-fill bg-[#5EEAD4]" />
      ) : null}
      {partial ? (
        <div className="absolute inset-0 bg-gradient-to-b from-[#5EEAD4] to-[#2A2F4A]" />
      ) : null}
    </div>
  );
}

export function PathNode({
  node,
  isLast,
  compact = false,
  connectorFrom,
  onNodeClick,
}: PathNodeProps) {
  const styles = stateStyles[node.state];
  const inProgress = node.state === "in-progress";
  const progress = Math.min(100, Math.max(0, node.progress ?? 0));
  const isLocked = node.state === "locked";
  const canNavigate = !isLocked && Boolean(node.href);
  const canClick = !isLocked && Boolean(onNodeClick);

  const body = (
    <div
      className={cn(
        "rounded-xl border px-3",
        compact ? "py-2" : "px-3.5 py-3 md:px-4 md:py-3.5",
        styles.cardBg,
        styles.cardBorder,
        inProgress &&
          "shadow-[0_0_28px_rgba(94,234,212,0.22),0_0_12px_rgba(94,234,212,0.12)]",
        (canNavigate || canClick) &&
          "transition-colors hover:border-[#5EEAD4]/45",
      )}
    >
      <p
        className={cn(
          "break-words font-medium leading-snug text-[#EDEFF7]",
          compact ? "text-xs" : "text-sm md:text-[15px]",
          styles.dim && "text-[#8B93B0]",
        )}
      >
        {node.label}
      </p>
      {node.subtitle ? (
        <p
          className={cn(
            "mt-1 break-words text-[#8B93B0]",
            compact ? "text-[10px]" : "text-xs",
            styles.dim && "opacity-80",
          )}
        >
          {node.subtitle}
        </p>
      ) : null}
      {inProgress && node.progress != null ? (
        <div className="mt-2 flex items-center gap-2">
          <div className="h-0.5 flex-1 overflow-hidden rounded-full bg-[#2A2F4A]">
            <div
              className="h-full rounded-full bg-[#5EEAD4]"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="font-mono text-[10px] text-[#5EEAD4]">
            {progress}%
          </span>
        </div>
      ) : null}
    </div>
  );

  let interactive: ReactNode;
  if (canNavigate && node.href) {
    interactive = (
      <Link
        href={node.href}
        className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5EEAD4]/40"
        aria-label={`${node.label}, ${node.state}`}
      >
        {body}
      </Link>
    );
  } else if (canClick) {
    interactive = (
      <button
        type="button"
        onClick={() => onNodeClick?.(node)}
        className="block w-full rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5EEAD4]/40"
        aria-label={`${node.label}, ${node.state}`}
      >
        {body}
      </button>
    );
  } else {
    interactive = (
      <div
        aria-disabled={isLocked || undefined}
        aria-label={`${node.label}, ${node.state}`}
        className={cn(isLocked && "cursor-default select-none")}
      >
        {body}
      </div>
    );
  }

  return (
    <div className="flex items-stretch">
      <div
        className={cn(
          "flex shrink-0 flex-col items-center",
          compact ? "w-8" : "w-9 md:w-10",
        )}
      >
        <NodeDot state={node.state} />
        {!isLast ? (
          <Connector
            from={connectorFrom ?? node.state}
            dim={styles.dim}
            compact={compact}
          />
        ) : null}
      </div>
      <div
        className={cn(
          "min-w-0 flex-1",
          compact ? "ml-2.5" : "ml-3 md:ml-3.5",
          !isLast && (compact ? "pb-3.5" : "pb-4 md:pb-5"),
          styles.dim && "opacity-40",
        )}
      >
        {interactive}
      </div>
    </div>
  );
}

export type LearningPathProps = {
  /** Optional skill/path eyebrow shown above the nodes */
  title?: string;
  nodes: PathNodeData[];
  className?: string;
  /** Tighter padding/type for marketing hero preview */
  compact?: boolean;
  onNodeClick?: (node: PathNodeData) => void;
};

/**
 * Vertical connected-node learning path.
 * Shared by the marketing preview and the skill Learning Path screen.
 */
export function LearningPath({
  title,
  nodes,
  className,
  compact = false,
  onNodeClick,
}: LearningPathProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-[#2A2F4A] bg-[#171B2E]",
        "shadow-[0_8px_32px_rgba(0,0,0,0.35)]",
        compact ? "p-4" : "p-4 md:p-5",
        className,
      )}
    >
      {title ? (
        <div className={cn("flex items-center gap-2", compact ? "mb-4" : "mb-5")}>
          <span className="size-2 shrink-0 rounded-full bg-[#5EEAD4]" aria-hidden />
          <span className="truncate text-[11px] font-semibold tracking-[0.5px] text-[#5EEAD4] uppercase">
            {title}
          </span>
        </div>
      ) : null}

      <ol className="m-0 flex list-none flex-col gap-0 p-0">
        {nodes.map((node, index) => (
          <li key={node.id}>
            <PathNode
              node={node}
              isLast={index === nodes.length - 1}
              compact={compact}
              connectorFrom={node.state}
              onNodeClick={onNodeClick}
            />
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Demo nodes for marketing / empty states */
export const MARKETING_PATH_PREVIEW_NODES: PathNodeData[] = [
  { id: "arrays", label: "Arrays & Hashing", state: "completed" },
  { id: "two-pointers", label: "Two Pointers", state: "completed" },
  {
    id: "linked-lists",
    label: "Linked Lists",
    state: "in-progress",
    progress: 35,
  },
  { id: "trees", label: "Binary Trees", state: "available" },
  { id: "dp", label: "Dynamic Programming", state: "locked" },
];
