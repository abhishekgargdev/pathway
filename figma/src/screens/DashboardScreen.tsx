import { useState, useEffect } from "react";

const skills = [
  { name: "Data Structures & Algorithms", progress: 0.42, nodes: 18, done: 7, isNew: true },
  { name: "System Design", progress: 0.25, nodes: 12, done: 3, isNew: false },
  { name: "Machine Learning Fundamentals", progress: 0.08, nodes: 20, done: 2, isNew: true },
];

function StreakCounter({ value }: { value: number }) {
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    let current = 0;
    const step = Math.ceil(value / 20);
    const timer = setInterval(() => {
      current = Math.min(current + step, value);
      setDisplayed(current);
      if (current >= value) clearInterval(timer);
    }, 40);
    return () => clearInterval(timer);
  }, [value]);

  return (
    <span
      style={{
        fontFamily: "JetBrains Mono, monospace",
        fontSize: "40px",
        fontWeight: 600,
        color: "#FBBF24",
        display: "block",
        lineHeight: 1,
      }}
    >
      {displayed}
    </span>
  );
}

export default function DashboardScreen({
  onSkill,
  onManage,
}: {
  onSkill: () => void;
  onManage: () => void;
}) {
  return (
    <div className="h-full overflow-y-auto" style={{ background: "#0E1220" }}>
      <div className="px-5 pt-14 pb-6">
        <p style={{ color: "#8B93B0", fontSize: "13px", marginBottom: "4px" }}>
          Thursday, Aug 21
        </p>
        <h1
          style={{
            fontFamily: "Space Grotesk, sans-serif",
            fontSize: "26px",
            fontWeight: 700,
            color: "#EDEFF7",
          }}
        >
          Good morning, Alex 👋
        </h1>
      </div>

      <div className="px-5 mb-5">
        <div
          className="relative rounded-2xl p-5 overflow-hidden"
          style={{
            background: "#171B2E",
            border: "1px solid rgba(251,191,36,0.2)",
            boxShadow: "0 0 32px rgba(251,191,36,0.12), 0 8px 24px rgba(0,0,0,0.3)",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: "-30px",
              right: "-30px",
              width: "120px",
              height: "120px",
              borderRadius: "9999px",
              background: "radial-gradient(circle, rgba(251,191,36,0.15) 0%, transparent 70%)",
              pointerEvents: "none",
            }}
          />
          <div className="relative flex items-start justify-between">
            <div>
              <p style={{
                color: "#8B93B0",
                fontSize: "11px",
                fontWeight: 600,
                letterSpacing: "0.8px",
                textTransform: "uppercase",
                marginBottom: "10px",
                fontFamily: "Inter, sans-serif",
              }}>
                Current streak
              </p>
              <StreakCounter value={14} />
              <p style={{ color: "#FBBF24", fontSize: "13px", marginTop: "6px" }}>
                days in a row 🔥
              </p>
            </div>
            <div className="flex flex-col items-end gap-1.5 pt-1">
              {[true, true, true, true, false, false, false].map((active, i) => (
                <div
                  key={i}
                  style={{
                    width: "10px",
                    height: "10px",
                    borderRadius: "3px",
                    background: active ? "#FBBF24" : "#2A2F4A",
                    boxShadow: active ? "0 0 6px rgba(251,191,36,0.6)" : "none",
                  }}
                />
              ))}
              <p style={{ color: "#8B93B0", fontSize: "10px", marginTop: "2px", fontFamily: "Inter, sans-serif" }}>
                last 7 days
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-5 mb-5">
        <div
          className="relative rounded-2xl p-5 overflow-hidden cursor-pointer active:scale-99 transition-transform"
          onClick={onSkill}
          style={{
            background: "#171B2E",
            border: "1px solid rgba(94,234,212,0.25)",
            boxShadow: "0 0 32px rgba(94,234,212,0.12), 0 8px 24px rgba(0,0,0,0.3)",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: "-40px",
              left: "-20px",
              width: "160px",
              height: "160px",
              borderRadius: "9999px",
              background: "radial-gradient(circle, rgba(94,234,212,0.1) 0%, transparent 70%)",
              pointerEvents: "none",
            }}
          />
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <span style={{
                background: "rgba(94,234,212,0.15)",
                color: "#5EEAD4",
                fontSize: "11px",
                fontWeight: 600,
                padding: "4px 10px",
                borderRadius: "9999px",
                letterSpacing: "0.5px",
                fontFamily: "Inter, sans-serif",
              }}>
                CONTINUE
              </span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5EEAD4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </div>

            <h3 style={{
              fontFamily: "Space Grotesk, sans-serif",
              fontSize: "18px",
              fontWeight: 700,
              color: "#EDEFF7",
              marginBottom: "4px",
            }}>
              Binary Search Trees
            </h3>
            <p style={{ color: "#8B93B0", fontSize: "13px", marginBottom: "16px" }}>
              Data Structures & Algorithms · Topic 7 of 18
            </p>

            <div>
              <div style={{
                height: "5px",
                background: "#2A2F4A",
                borderRadius: "9999px",
                overflow: "hidden",
                marginBottom: "8px",
              }}>
                <div style={{
                  width: "42%",
                  height: "100%",
                  background: "linear-gradient(90deg, #5EEAD4, #8B7CF6)",
                  borderRadius: "9999px",
                }} />
              </div>
              <div className="flex justify-between">
                <p style={{ color: "#8B93B0", fontSize: "12px" }}>42% complete</p>
                <p style={{ color: "#5EEAD4", fontSize: "12px", fontFamily: "JetBrains Mono, monospace" }}>7 / 18</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-5 mb-6">
        <h2 style={{
          fontFamily: "Space Grotesk, sans-serif",
          fontSize: "16px",
          fontWeight: 600,
          color: "#EDEFF7",
          marginBottom: "14px",
        }}>
          Active skills
        </h2>

        <div className="flex flex-col gap-3">
          {skills.map((skill) => (
            <div
              key={skill.name}
              onClick={onSkill}
              className="rounded-2xl p-4 cursor-pointer active:scale-98 transition-transform"
              style={{
                background: "#171B2E",
                border: "1px solid #2A2F4A",
                boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <span style={{
                  color: "#EDEFF7",
                  fontSize: "14px",
                  fontWeight: 500,
                  fontFamily: "Space Grotesk, sans-serif",
                  flex: 1,
                  marginRight: "12px",
                }}>
                  {skill.name}
                </span>
                {skill.isNew && (
                  <span style={{
                    background: "rgba(251,191,36,0.15)",
                    color: "#FBBF24",
                    fontSize: "10px",
                    fontWeight: 700,
                    padding: "3px 8px",
                    borderRadius: "9999px",
                    letterSpacing: "0.5px",
                    flexShrink: 0,
                    fontFamily: "Inter, sans-serif",
                  }}>
                    NEW
                  </span>
                )}
              </div>

              <div style={{
                height: "4px",
                background: "#2A2F4A",
                borderRadius: "9999px",
                overflow: "hidden",
                marginBottom: "8px",
              }}>
                <div style={{
                  width: `${skill.progress * 100}%`,
                  height: "100%",
                  background: "#5EEAD4",
                  borderRadius: "9999px",
                  transition: "width 0.6s ease",
                }} />
              </div>

              <div className="flex justify-between items-center">
                <p style={{ color: "#8B93B0", fontSize: "12px" }}>
                  {skill.done} of {skill.nodes} topics
                </p>
                <p style={{ color: "#5EEAD4", fontSize: "12px", fontWeight: 500 }}>
                  {Math.round(skill.progress * 100)}%
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="px-5 pb-6">
        <button
          onClick={onManage}
          className="w-full py-3.5 rounded-xl text-sm font-medium transition-all active:scale-95"
          style={{
            background: "#171B2E",
            color: "#8B93B0",
            border: "1px solid #2A2F4A",
            fontFamily: "Inter, sans-serif",
            cursor: "pointer",
            fontSize: "14px",
          }}
        >
          Content Ops →
        </button>
      </div>
    </div>
  );
}
