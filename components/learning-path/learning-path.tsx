import { Check } from "lucide-react";
import Link from "next/link";

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
  /** 0–100, shown on in-progress nodes */
  progress?: number;
  href?: string;
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
    cardBorder: "border-[#5EEAD4]/30",
    cardBg: "bg-[#5EEAD4]/[0.08]",
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
        "flex size-5 shrink-0 items-center justify-center rounded-full border-2",
        styles.fill,
        styles.stroke,
        inProgress && "shadow-[0_0_12px_rgba(94,234,212,0.7)]",
        inProgress && "animate-path-pulse",
      )}
      aria-hidden
    >
      {state === "completed" ? (
        <Check className="size-2.5 stroke-[#0E1220] stroke-[3]" />
      ) : null}
      {inProgress ? (
        <span className="size-1.5 rounded-full bg-[#0E1220]" />
      ) : null}
    </div>
  );
}

function connectorClass(from: PathNodeState | undefined): string {
  if (from === "completed") return "bg-[#5EEAD4]";
  if (from === "in-progress") {
    return "bg-gradient-to-b from-[#5EEAD4] to-[#2A2F4A]";
  }
  return "bg-[#2A2F4A]";
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

  const body = (
    <div
      className={cn(
        "rounded-xl border px-3",
        compact ? "py-2" : "py-2.5",
        styles.cardBg,
        styles.cardBorder,
        inProgress && "shadow-[0_0_16px_rgba(94,234,212,0.15)]",
        (node.href || onNodeClick) &&
          node.state !== "locked" &&
          "transition-colors hover:border-[#5EEAD4]/40",
      )}
    >
      <p
        className={cn(
          "break-words font-medium leading-snug text-[#EDEFF7]",
          compact ? "text-xs" : "text-sm",
          styles.dim && "text-[#8B93B0]",
        )}
      >
        {node.label}
      </p>
      {inProgress ? (
        <div className="mt-1.5 flex items-center gap-2">
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

  const interactive =
    node.state !== "locked" && (node.href || onNodeClick) ? (
      node.href ? (
        <Link
          href={node.href}
          className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5EEAD4]/40"
          aria-label={`${node.label}, ${node.state}`}
        >
          {body}
        </Link>
      ) : (
        <button
          type="button"
          onClick={() => onNodeClick?.(node)}
          className="block w-full rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5EEAD4]/40"
          aria-label={`${node.label}, ${node.state}`}
        >
          {body}
        </button>
      )
    ) : (
      <div aria-label={`${node.label}, ${node.state}`}>{body}</div>
    );

  return (
    <div className="flex items-stretch">
      <div className="flex w-8 shrink-0 flex-col items-center">
        <NodeDot state={node.state} />
        {!isLast ? (
          <div
            className={cn(
              "mt-0 w-0.5 min-h-5 flex-1",
              connectorClass(connectorFrom ?? node.state),
              styles.dim && "opacity-35",
            )}
          />
        ) : null}
      </div>
      <div
        className={cn(
          "ml-2.5 min-w-0 flex-1",
          !isLast && (compact ? "pb-3.5" : "pb-4"),
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
        compact ? "p-4" : "p-5",
        className,
      )}
    >
      {title ? (
        <div className="mb-4 flex items-center gap-2">
          <span className="size-2 shrink-0 rounded-full bg-[#5EEAD4]" aria-hidden />
          <span className="truncate text-[11px] font-semibold tracking-[0.5px] text-[#5EEAD4] uppercase">
            {title}
          </span>
        </div>
      ) : null}

      <ol className="m-0 flex list-none flex-col p-0">
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
