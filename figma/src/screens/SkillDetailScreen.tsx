type NodeState = "locked" | "available" | "in-progress" | "completed";

interface PathNode {
  id: number;
  title: string;
  subtitle: string;
  state: NodeState;
}

const nodes: PathNode[] = [
  { id: 1, title: "Arrays & Hashing", subtitle: "Basics of array ops and hash maps", state: "completed" },
  { id: 2, title: "Two Pointers", subtitle: "Sliding window and two-pointer patterns", state: "completed" },
  { id: 3, title: "Stacks & Queues", subtitle: "LIFO/FIFO and monotonic stacks", state: "completed" },
  { id: 4, title: "Binary Search", subtitle: "Search in O(log n) sorted structures", state: "completed" },
  { id: 5, title: "Linked Lists", subtitle: "Traversal, reversal, and fast/slow ptrs", state: "in-progress" },
  { id: 6, title: "Trees & DFS", subtitle: "Depth-first traversal and recursion", state: "available" },
  { id: 7, title: "Binary Search Trees", subtitle: "Insert, delete, and validate BSTs", state: "available" },
  { id: 8, title: "Heaps & Priority Queues", subtitle: "Min/max heaps and top-K problems", state: "locked" },
  { id: 9, title: "Graphs & BFS", subtitle: "Adjacency lists and breadth-first search", state: "locked" },
  { id: 10, title: "Dynamic Programming", subtitle: "Memoization and tabulation", state: "locked" },
];

const nodeFill: Record<NodeState, string> = {
  locked: "transparent",
  available: "transparent",
  "in-progress": "#5EEAD4",
  completed: "#5EEAD4",
};

const nodeStroke: Record<NodeState, string> = {
  locked: "#2A2F4A",
  available: "#5EEAD4",
  "in-progress": "#5EEAD4",
  completed: "#5EEAD4",
};

const lineColor = (state: NodeState): string => {
  if (state === "completed") return "#5EEAD4";
  if (state === "in-progress") return "#2A2F4A";
  return "#2A2F4A";
};

export default function SkillDetailScreen({
  onNode,
  onBack,
}: {
  onNode: () => void;
  onBack: () => void;
}) {
  return (
    <div className="h-full flex flex-col" style={{ background: "#0E1220" }}>
      <div
        className="flex items-center gap-3 px-5 pt-12 pb-5"
        style={{ background: "#0E1220" }}
      >
        <button
          onClick={onBack}
          style={{
            background: "#1F2440",
            border: "1px solid #2A2F4A",
            borderRadius: "12px",
            color: "#EDEFF7",
            width: "40px",
            height: "40px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <div>
          <h1 style={{
            fontFamily: "Space Grotesk, sans-serif",
            fontSize: "18px",
            fontWeight: 700,
            color: "#EDEFF7",
          }}>
            Data Structures & Algorithms
          </h1>
          <p style={{ color: "#8B93B0", fontSize: "12px", marginTop: "2px" }}>
            7 of 18 topics complete
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-10">
        <div className="flex flex-col">
          {nodes.map((node, i) => {
            const isLast = i === nodes.length - 1;
            const isClickable = node.state === "available" || node.state === "in-progress";
            const isInProgress = node.state === "in-progress";
            const isLocked = node.state === "locked";

            return (
              <div key={node.id} className="flex" style={{ alignItems: "stretch" }}>
                <div
                  className="flex flex-col items-center"
                  style={{ width: "36px", flexShrink: 0 }}
                >
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "9999px",
                      background: nodeFill[node.state],
                      border: `2px solid ${nodeStroke[node.state]}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      boxShadow: isInProgress
                        ? "0 0 20px rgba(94,234,212,0.7)"
                        : node.state === "available"
                        ? "0 0 10px rgba(94,234,212,0.2)"
                        : "none",
                      animation: isInProgress ? "pulse-glow 2s ease-in-out infinite" : "none",
                      transition: "all 0.3s ease",
                      opacity: isLocked ? 0.4 : 1,
                      zIndex: 1,
                    }}
                  >
                    {node.state === "completed" && (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#0E1220" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    )}
                    {node.state === "locked" && (
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#4A5268" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                      </svg>
                    )}
                    {isInProgress && (
                      <div style={{ width: "8px", height: "8px", borderRadius: "9999px", background: "#0E1220" }} />
                    )}
                  </div>

                  {!isLast && (
                    <div style={{
                      width: "2px",
                      flex: 1,
                      minHeight: "20px",
                      background: lineColor(node.state),
                      opacity: isLocked ? 0.25 : 1,
                      transition: "background 0.5s ease",
                    }} />
                  )}
                </div>

                <div
                  style={{
                    flex: 1,
                    marginLeft: "14px",
                    paddingBottom: isLast ? "0" : "12px",
                    paddingTop: "2px",
                    opacity: isLocked ? 0.45 : 1,
                  }}
                >
                  <div
                    onClick={isClickable ? onNode : undefined}
                    className={isClickable ? "cursor-pointer active:scale-98 transition-transform" : ""}
                    style={{
                      borderRadius: "16px",
                      padding: "14px 16px",
                      background: isInProgress
                        ? "rgba(94,234,212,0.07)"
                        : node.state === "available"
                        ? "#171B2E"
                        : "#171B2E",
                      border: `1px solid ${
                        isInProgress
                          ? "rgba(94,234,212,0.35)"
                          : node.state === "available"
                          ? "rgba(94,234,212,0.18)"
                          : "#2A2F4A"
                      }`,
                      boxShadow: isInProgress
                        ? "0 0 28px rgba(94,234,212,0.18), 0 4px 16px rgba(0,0,0,0.2)"
                        : node.state === "available"
                        ? "0 4px 12px rgba(0,0,0,0.15)"
                        : "0 2px 8px rgba(0,0,0,0.1)",
                      transition: "all 0.3s ease",
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p style={{
                          fontFamily: "Space Grotesk, sans-serif",
                          fontSize: "14px",
                          fontWeight: 600,
                          color: isLocked ? "#8B93B0" : "#EDEFF7",
                          marginBottom: "3px",
                        }}>
                          {node.title}
                        </p>
                        <p style={{ color: "#8B93B0", fontSize: "12px", lineHeight: 1.4 }}>
                          {node.subtitle}
                        </p>
                      </div>
                      {isClickable && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5EEAD4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: "2px" }}>
                          <path d="M5 12h14M12 5l7 7-7 7"/>
                        </svg>
                      )}
                    </div>

                    {isInProgress && (
                      <div className="mt-3">
                        <div style={{
                          height: "3px",
                          background: "#2A2F4A",
                          borderRadius: "9999px",
                          overflow: "hidden",
                          marginBottom: "6px",
                        }}>
                          <div style={{
                            width: "35%",
                            height: "100%",
                            background: "linear-gradient(90deg, #5EEAD4, #8B7CF6)",
                            borderRadius: "9999px",
                          }} />
                        </div>
                        <div className="flex justify-between items-center">
                          <p style={{ color: "#5EEAD4", fontSize: "11px", fontWeight: 500 }}>
                            In progress
                          </p>
                          <span style={{
                            fontFamily: "JetBrains Mono, monospace",
                            fontSize: "11px",
                            color: "#5EEAD4",
                          }}>
                            35%
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
