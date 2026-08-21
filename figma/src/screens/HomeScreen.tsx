import PathwayLogo from "../components/PathwayLogo";

function MiniPathPreview() {
  const nodes = [
    { state: "completed", label: "Arrays & Hashing" },
    { state: "completed", label: "Two Pointers" },
    { state: "in-progress", label: "Linked Lists" },
    { state: "available", label: "Binary Trees" },
    { state: "locked", label: "Dynamic Programming" },
  ];

  const stateConfig = {
    completed: { fill: "#5EEAD4", stroke: "#5EEAD4", dim: false },
    "in-progress": { fill: "#5EEAD4", stroke: "#5EEAD4", dim: false },
    available: { fill: "transparent", stroke: "#5EEAD4", dim: false },
    locked: { fill: "transparent", stroke: "#2A2F4A", dim: true },
  };

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: "#171B2E",
        border: "1px solid #2A2F4A",
        padding: "20px 16px",
        boxShadow: "0 0 40px rgba(94,234,212,0.1), 0 8px 32px rgba(0,0,0,0.4)",
      }}
    >
      <div className="flex items-center gap-2 mb-4">
        <div style={{ width: "8px", height: "8px", borderRadius: "9999px", background: "#5EEAD4" }} />
        <span style={{ color: "#5EEAD4", fontSize: "11px", fontWeight: 600, fontFamily: "Inter, sans-serif", letterSpacing: "0.5px" }}>
          DATA STRUCTURES & ALGORITHMS
        </span>
      </div>

      <div className="flex flex-col" style={{ gap: "0" }}>
        {nodes.map((node, i) => {
          const cfg = stateConfig[node.state as keyof typeof stateConfig];
          const isInProgress = node.state === "in-progress";
          const isLast = i === nodes.length - 1;

          return (
            <div key={i} className="flex" style={{ alignItems: "stretch" }}>
              <div className="flex flex-col items-center" style={{ width: "32px", flexShrink: 0 }}>
                <div
                  style={{
                    width: "20px",
                    height: "20px",
                    borderRadius: "9999px",
                    background: cfg.fill,
                    border: `2px solid ${cfg.stroke}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    boxShadow: isInProgress ? "0 0 12px rgba(94,234,212,0.7)" : "none",
                    animation: isInProgress ? "pulse-glow 2s ease-in-out infinite" : "none",
                  }}
                >
                  {node.state === "completed" && (
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#0E1220" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  )}
                  {isInProgress && (
                    <div style={{ width: "6px", height: "6px", borderRadius: "9999px", background: "#0E1220" }} />
                  )}
                </div>
                {!isLast && (
                  <div style={{
                    width: "2px",
                    flex: 1,
                    minHeight: "20px",
                    background: node.state === "completed"
                      ? "#5EEAD4"
                      : isInProgress
                      ? "linear-gradient(to bottom, #5EEAD4, #2A2F4A)"
                      : "#2A2F4A",
                    opacity: cfg.dim ? 0.35 : 1,
                  }} />
                )}
              </div>

              <div
                style={{
                  flex: 1,
                  marginLeft: "10px",
                  paddingBottom: isLast ? "0" : "14px",
                  opacity: cfg.dim ? 0.4 : 1,
                }}
              >
                <div
                  className="rounded-xl px-3 py-2"
                  style={{
                    background: isInProgress ? "rgba(94,234,212,0.08)" : "rgba(255,255,255,0.03)",
                    border: `1px solid ${isInProgress ? "rgba(94,234,212,0.3)" : node.state === "available" ? "rgba(94,234,212,0.15)" : "#2A2F4A"}`,
                    boxShadow: isInProgress ? "0 0 16px rgba(94,234,212,0.15)" : "none",
                  }}
                >
                  <p
                    style={{
                      color: cfg.dim ? "#8B93B0" : "#EDEFF7",
                      fontSize: "12px",
                      fontFamily: "Inter, sans-serif",
                      fontWeight: 500,
                      lineHeight: 1.3,
                    }}
                  >
                    {node.label}
                  </p>
                  {isInProgress && (
                    <div className="flex items-center gap-2 mt-1.5">
                      <div style={{ flex: 1, height: "2px", background: "#2A2F4A", borderRadius: "9999px", overflow: "hidden" }}>
                        <div style={{ width: "35%", height: "100%", background: "#5EEAD4", borderRadius: "9999px" }} />
                      </div>
                      <span style={{ color: "#5EEAD4", fontSize: "10px", fontFamily: "JetBrains Mono, monospace" }}>35%</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ChallengePreview() {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: "#171B2E",
        border: "1px solid #2A2F4A",
        boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
      }}
    >
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{ borderBottom: "1px solid #2A2F4A", background: "#1F2440" }}
      >
        <span style={{ color: "#EDEFF7", fontSize: "13px", fontFamily: "Space Grotesk, sans-serif", fontWeight: 600 }}>
          Reverse a Linked List
        </span>
        <span style={{
          background: "rgba(94,234,212,0.15)",
          color: "#5EEAD4",
          fontSize: "10px",
          fontWeight: 700,
          padding: "2px 8px",
          borderRadius: "9999px",
          fontFamily: "Inter, sans-serif",
        }}>
          Easy
        </span>
      </div>

      <div className="px-4 py-3 flex flex-col gap-2">
        {[
          { input: "[1,2,3,4,5]", expected: "[5,4,3,2,1]", passed: true },
          { input: "[1,2]", expected: "[2,1]", passed: true },
          { input: "[]", expected: "[]", passed: true },
        ].map((t, i) => (
          <div key={i} className="flex items-center gap-2">
            <div style={{
              width: "14px", height: "14px", borderRadius: "9999px",
              background: "#5EEAD4", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#0E1220" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <code style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "11px", color: "#8B93B0" }}>
              {t.input} → <span style={{ color: "#5EEAD4" }}>{t.expected}</span>
            </code>
          </div>
        ))}
      </div>

      <div className="px-4 pb-3 flex items-center gap-2">
        <span style={{
          background: "#1F2440",
          border: "1px solid #2A2F4A",
          borderRadius: "9999px",
          padding: "3px 10px",
          fontFamily: "JetBrains Mono, monospace",
          fontSize: "11px",
          color: "#5EEAD4",
        }}>
          <span style={{ color: "#8B93B0" }}>Time</span> O(n)
        </span>
        <span style={{
          background: "#1F2440",
          border: "1px solid #2A2F4A",
          borderRadius: "9999px",
          padding: "3px 10px",
          fontFamily: "JetBrains Mono, monospace",
          fontSize: "11px",
          color: "#5EEAD4",
        }}>
          <span style={{ color: "#8B93B0" }}>Space</span> O(1)
        </span>
        <span style={{
          marginLeft: "auto",
          background: "rgba(251,191,36,0.15)",
          color: "#FBBF24",
          fontSize: "11px",
          fontWeight: 700,
          padding: "3px 8px",
          borderRadius: "9999px",
          fontFamily: "Inter, sans-serif",
        }}>
          ★★★★★
        </span>
      </div>
    </div>
  );
}

const steps = [
  {
    num: "01",
    title: "Pick a skill",
    desc: "Name anything — a language, a CS concept, a framework. Pathway generates a structured topic tree for it.",
  },
  {
    num: "02",
    title: "Follow the path",
    desc: "Work through AI-generated subtopics in order. Each one has a lesson, examples, and a short quiz to confirm you got it.",
  },
  {
    num: "03",
    title: "Prove it with code",
    desc: "Every topic ends with a judged coding challenge. Pass the test cases, then study five expert solutions with complexity analysis.",
  },
];

export default function HomeScreen({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="h-full overflow-y-auto" style={{ background: "#0E1220" }}>
      <div
        className="relative px-5 pt-16 pb-10"
        style={{
          background: "#0E1220",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "radial-gradient(ellipse 90% 50% at 50% -5%, rgba(94,234,212,0.12) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        <div className="relative">
          <div className="flex items-center gap-2 mb-6">
            <PathwayLogo size={28} />
            <span style={{
              fontFamily: "Space Grotesk, sans-serif",
              fontSize: "16px",
              fontWeight: 700,
              color: "#EDEFF7",
            }}>
              Pathway
            </span>
          </div>

          <h1
            style={{
              fontFamily: "Space Grotesk, sans-serif",
              fontSize: "clamp(28px, 8vw, 36px)",
              fontWeight: 700,
              letterSpacing: "-0.8px",
              lineHeight: 1.15,
              color: "#EDEFF7",
              marginBottom: "16px",
            }}
          >
            Your AI tutor builds{" "}
            <span style={{
              background: "linear-gradient(90deg, #5EEAD4, #8B7CF6)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}>
              your exact path
            </span>{" "}
            through any skill.
          </h1>

          <p style={{
            color: "#8B93B0",
            fontSize: "15px",
            lineHeight: 1.65,
            marginBottom: "28px",
            maxWidth: "320px",
          }}>
            Pick a skill → get a generated topic tree → confirm understanding with quick checks → prove it with judged coding challenges.
          </p>

          <button
            onClick={onLogin}
            className="w-full py-4 rounded-xl font-semibold text-sm transition-all duration-200 active:scale-95"
            style={{
              background: "#5EEAD4",
              color: "#0E1220",
              fontFamily: "Space Grotesk, sans-serif",
              fontSize: "16px",
              border: "none",
              cursor: "pointer",
              boxShadow: "0 0 32px rgba(94,234,212,0.35), 0 4px 16px rgba(0,0,0,0.3)",
              maxWidth: "320px",
            }}
          >
            Log in to Pathway
          </button>
        </div>
      </div>

      <div className="px-5 pb-10">
        <p style={{
          color: "#8B93B0",
          fontSize: "11px",
          fontWeight: 600,
          letterSpacing: "1px",
          textTransform: "uppercase",
          marginBottom: "14px",
          fontFamily: "Inter, sans-serif",
        }}>
          Live path preview
        </p>
        <MiniPathPreview />
      </div>

      <div className="px-5 pb-10">
        <p style={{
          color: "#8B93B0",
          fontSize: "11px",
          fontWeight: 600,
          letterSpacing: "1px",
          textTransform: "uppercase",
          marginBottom: "6px",
          fontFamily: "Inter, sans-serif",
        }}>
          How it works
        </p>
        <h2 style={{
          fontFamily: "Space Grotesk, sans-serif",
          fontSize: "22px",
          fontWeight: 700,
          color: "#EDEFF7",
          marginBottom: "20px",
          letterSpacing: "-0.3px",
        }}>
          From zero to proven, step by step
        </h2>

        <div className="flex flex-col gap-4">
          {steps.map((step) => (
            <div
              key={step.num}
              className="rounded-2xl p-5 flex gap-4"
              style={{
                background: "#171B2E",
                border: "1px solid #2A2F4A",
                boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
              }}
            >
              <span style={{
                fontFamily: "JetBrains Mono, monospace",
                fontSize: "13px",
                fontWeight: 600,
                color: "#5EEAD4",
                opacity: 0.7,
                lineHeight: 1,
                paddingTop: "2px",
                flexShrink: 0,
              }}>
                {step.num}
              </span>
              <div>
                <h3 style={{
                  fontFamily: "Space Grotesk, sans-serif",
                  fontSize: "15px",
                  fontWeight: 600,
                  color: "#EDEFF7",
                  marginBottom: "6px",
                }}>
                  {step.title}
                </h3>
                <p style={{
                  color: "#8B93B0",
                  fontSize: "13px",
                  lineHeight: 1.6,
                }}>
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="px-5 pb-10">
        <p style={{
          color: "#8B93B0",
          fontSize: "11px",
          fontWeight: 600,
          letterSpacing: "1px",
          textTransform: "uppercase",
          marginBottom: "14px",
          fontFamily: "Inter, sans-serif",
        }}>
          Not just flashcards
        </p>
        <ChallengePreview />
      </div>

      <div
        className="mx-5 mb-12 rounded-2xl px-6 py-8 text-center"
        style={{
          background: "linear-gradient(135deg, rgba(94,234,212,0.08), rgba(139,124,246,0.08))",
          border: "1px solid rgba(94,234,212,0.2)",
        }}
      >
        <p style={{
          fontFamily: "Space Grotesk, sans-serif",
          fontSize: "18px",
          fontWeight: 700,
          color: "#EDEFF7",
          marginBottom: "8px",
        }}>
          Ready to start learning?
        </p>
        <p style={{ color: "#8B93B0", fontSize: "14px", marginBottom: "20px" }}>
          One skill at a time, fully guided.
        </p>
        <button
          onClick={onLogin}
          className="px-8 py-3.5 rounded-xl font-semibold active:scale-95 transition-transform"
          style={{
            background: "#5EEAD4",
            color: "#0E1220",
            fontFamily: "Space Grotesk, sans-serif",
            fontSize: "15px",
            border: "none",
            cursor: "pointer",
            boxShadow: "0 0 24px rgba(94,234,212,0.3)",
          }}
        >
          Log in
        </button>
      </div>
    </div>
  );
}
