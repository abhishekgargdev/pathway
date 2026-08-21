type QueueItem = {
  id: string;
  skill: string;
  topic: string;
  status: "pending" | "generating" | "done" | "error";
  age: string;
};

const queue: QueueItem[] = [
  { id: "q1", skill: "DSA", topic: "Heaps & Priority Queues", status: "done", age: "2h ago" },
  { id: "q2", skill: "DSA", topic: "Graphs & BFS", status: "generating", age: "just now" },
  { id: "q3", skill: "System Design", topic: "Load Balancing", status: "pending", age: "queued" },
  { id: "q4", skill: "ML Fundamentals", topic: "Gradient Descent", status: "error", age: "35m ago" },
  { id: "q5", skill: "System Design", topic: "Database Sharding", status: "pending", age: "queued" },
];

const keys = [
  { name: "gemini-key-1", used: 820, limit: 1000 },
  { name: "gemini-key-2", used: 310, limit: 1000 },
  { name: "gemini-key-3", used: 55, limit: 1000 },
];

const statusColor: Record<QueueItem["status"], string> = {
  done: "#5EEAD4",
  generating: "#FBBF24",
  pending: "#8B93B0",
  error: "#FB7185",
};

const statusLabel: Record<QueueItem["status"], string> = {
  done: "Done",
  generating: "Generating…",
  pending: "Queued",
  error: "Error",
};

import { useState } from "react";

export default function ContentOpsScreen({ onBack }: { onBack: () => void }) {
  const [items, setItems] = useState(queue);

  const regen = (id: string) => {
    setItems((prev) =>
      prev.map((it) =>
        it.id === id ? { ...it, status: "generating" as const } : it
      )
    );
    setTimeout(() => {
      setItems((prev) =>
        prev.map((it) =>
          it.id === id ? { ...it, status: "done" as const, age: "just now" } : it
        )
      );
    }, 2000);
  };

  return (
    <div className="h-full flex flex-col" style={{ background: "#0E1220" }}>
      <div className="flex items-center gap-3 px-5 pt-12 pb-4">
        <button
          onClick={onBack}
          style={{
            background: "#1F2440",
            border: "1px solid #2A2F4A",
            borderRadius: "10px",
            color: "#EDEFF7",
            width: "36px",
            height: "36px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <div>
          <h1
            style={{
              fontFamily: "Space Grotesk, sans-serif",
              fontSize: "18px",
              fontWeight: 700,
              color: "#EDEFF7",
            }}
          >
            Content Ops
          </h1>
          <p style={{ color: "#8B93B0", fontSize: "12px" }}>
            Generation queue · API quota
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-10">
        <div
          className="rounded-2xl p-4 mb-6"
          style={{ background: "#171B2E", border: "1px solid #2A2F4A" }}
        >
          <p
            style={{
              color: "#8B93B0",
              fontSize: "11px",
              fontWeight: 600,
              letterSpacing: "0.5px",
              textTransform: "uppercase",
              marginBottom: "12px",
            }}
          >
            Gemini Key Quota
          </p>
          <div className="flex flex-col gap-4">
            {keys.map((k) => {
              const pct = k.used / k.limit;
              const color = pct > 0.8 ? "#FB7185" : pct > 0.5 ? "#FBBF24" : "#5EEAD4";
              return (
                <div key={k.name}>
                  <div className="flex justify-between mb-1">
                    <span
                      style={{
                        fontFamily: "JetBrains Mono, monospace",
                        fontSize: "12px",
                        color: "#EDEFF7",
                      }}
                    >
                      {k.name}
                    </span>
                    <span
                      style={{
                        fontFamily: "JetBrains Mono, monospace",
                        fontSize: "12px",
                        color,
                      }}
                    >
                      {k.used}/{k.limit}
                    </span>
                  </div>
                  <div
                    style={{
                      height: "5px",
                      background: "#2A2F4A",
                      borderRadius: "9999px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${pct * 100}%`,
                        height: "100%",
                        background: color,
                        borderRadius: "9999px",
                        transition: "width 0.4s ease",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <p
          style={{
            color: "#8B93B0",
            fontSize: "11px",
            fontWeight: 600,
            letterSpacing: "0.5px",
            textTransform: "uppercase",
            marginBottom: "10px",
          }}
        >
          Generation Queue ({items.length})
        </p>

        <div className="flex flex-col gap-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="rounded-xl px-4 py-3 flex items-center gap-3"
              style={{
                background: "#171B2E",
                border: "1px solid #2A2F4A",
                opacity: item.status === "pending" ? 0.7 : 1,
              }}
            >
              <div
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "9999px",
                  background: statusColor[item.status],
                  flexShrink: 0,
                  boxShadow:
                    item.status === "generating"
                      ? "0 0 8px rgba(251,191,36,0.6)"
                      : "none",
                  animation:
                    item.status === "generating"
                      ? "pulse-glow 1.5s ease-in-out infinite"
                      : "none",
                }}
              />
              <div className="flex-1 min-w-0">
                <p
                  style={{
                    color: "#EDEFF7",
                    fontSize: "13px",
                    fontWeight: 500,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {item.topic}
                </p>
                <p style={{ color: "#8B93B0", fontSize: "11px" }}>
                  {item.skill} · {item.age}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  style={{
                    color: statusColor[item.status],
                    fontSize: "11px",
                    fontWeight: 500,
                    whiteSpace: "nowrap",
                  }}
                >
                  {statusLabel[item.status]}
                </span>
                {(item.status === "error" || item.status === "done") && (
                  <button
                    onClick={() => regen(item.id)}
                    style={{
                      background: "#1F2440",
                      border: "1px solid #2A2F4A",
                      borderRadius: "8px",
                      color: "#8B93B0",
                      fontSize: "11px",
                      padding: "3px 8px",
                      cursor: "pointer",
                      fontFamily: "Inter, sans-serif",
                    }}
                  >
                    ↺
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
