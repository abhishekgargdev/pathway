import { useState } from "react";

const questions = [
  {
    q: "What is the time complexity to access the k-th element in a singly linked list?",
    options: ["O(1)", "O(log n)", "O(n)", "O(k log k)"],
    correct: 2,
    explanation: "Unlike arrays, linked lists require traversal from the head to reach any element, making access O(n) in the worst case.",
  },
  {
    q: "Which technique detects a cycle in a linked list using O(1) space?",
    options: [
      "Hashing visited nodes",
      "Fast and slow pointer (Floyd's algorithm)",
      "Reversing the list",
      "Counting nodes twice",
    ],
    correct: 1,
    explanation: "Floyd's cycle detection uses two pointers — one moves one step at a time, the other two steps. If there's a cycle, they'll meet.",
  },
  {
    q: "What happens when you insert at the head of a linked list?",
    options: [
      "O(n) — you must find the tail first",
      "O(log n) — binary shift of existing nodes",
      "O(1) — just update the head pointer",
      "O(n²) — nodes must be reindexed",
    ],
    correct: 2,
    explanation: "Head insertion only requires updating the new node's 'next' to the current head, and then setting head to the new node — constant time.",
  },
];

type Phase = "question" | "result";
type Result = "pass" | "fail" | null;

export default function QuizScreen({
  onPass,
  onBack,
}: {
  onPass: () => void;
  onBack: () => void;
}) {
  const [qi, setQi] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [phase, setPhase] = useState<Phase>("question");
  const [result, setResult] = useState<Result>(null);
  const [wrong, setWrong] = useState(0);
  const [burst, setBurst] = useState(false);

  const q = questions[qi];
  const isLast = qi === questions.length - 1;

  const handleSelect = (idx: number) => {
    if (phase !== "question") return;
    setSelected(idx);
    setTimeout(() => {
      const correct = idx === q.correct;
      if (!correct) {
        setWrong((w) => w + 1);
        setResult("fail");
        setPhase("result");
      } else if (isLast) {
        setBurst(true);
        setResult("pass");
        setPhase("result");
      } else {
        setQi((i) => i + 1);
        setSelected(null);
      }
    }, 600);
  };

  const handleRetry = () => {
    setQi(0);
    setSelected(null);
    setPhase("question");
    setResult(null);
    setWrong(0);
    setBurst(false);
  };

  if (phase === "result") {
    const passed = result === "pass";
    return (
      <div
        className="h-full flex flex-col items-center justify-center px-6"
        style={{ background: "#0E1220" }}
      >
        {burst && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "inherit",
              background: "radial-gradient(ellipse at 50% 40%, rgba(94,234,212,0.2) 0%, transparent 70%)",
              animation: "confetti-burst 1s ease-out forwards",
              pointerEvents: "none",
            }}
          />
        )}
        <div
          className="flex flex-col items-center gap-5 animate-slide-up"
          style={{ width: "100%", maxWidth: "340px" }}
        >
          <div
            style={{
              width: "72px",
              height: "72px",
              borderRadius: "9999px",
              background: passed ? "rgba(94,234,212,0.15)" : "rgba(251,113,133,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: `2px solid ${passed ? "#5EEAD4" : "#FB7185"}`,
              boxShadow: `0 0 24px ${passed ? "rgba(94,234,212,0.3)" : "rgba(251,113,133,0.3)"}`,
            }}
          >
            {passed ? (
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#5EEAD4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            ) : (
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#FB7185" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            )}
          </div>

          <div className="text-center">
            <h2
              style={{
                fontFamily: "Space Grotesk, sans-serif",
                fontSize: "24px",
                fontWeight: 700,
                color: "#EDEFF7",
                marginBottom: "8px",
              }}
            >
              {passed ? "Quiz passed!" : "Not quite"}
            </h2>
            <p style={{ color: "#8B93B0", fontSize: "15px", lineHeight: 1.5 }}>
              {passed
                ? `Perfect score! You got all ${questions.length} questions right.`
                : `You missed ${wrong} question${wrong > 1 ? "s" : ""}. Review the topic and try again.`}
            </p>
          </div>

          {!passed && (
            <div
              className="w-full rounded-2xl p-4"
              style={{ background: "#171B2E", border: "1px solid #2A2F4A" }}
            >
              <p style={{ color: "#8B93B0", fontSize: "12px", marginBottom: "8px", fontWeight: 500 }}>
                EXPLANATION
              </p>
              <p style={{ color: "#EDEFF7", fontSize: "14px", lineHeight: 1.6 }}>
                {q.explanation}
              </p>
            </div>
          )}

          {passed ? (
            <button
              onClick={onPass}
              className="w-full py-4 rounded-xl font-semibold active:scale-95 transition-transform"
              style={{
                background: "#5EEAD4",
                color: "#0E1220",
                fontFamily: "Space Grotesk, sans-serif",
                fontSize: "16px",
                border: "none",
                cursor: "pointer",
                boxShadow: "0 0 24px rgba(94,234,212,0.35)",
              }}
            >
              Coding challenge →
            </button>
          ) : (
            <div className="flex flex-col gap-3 w-full">
              <button
                onClick={handleRetry}
                className="w-full py-4 rounded-xl font-semibold active:scale-95 transition-transform"
                style={{
                  background: "#FB7185",
                  color: "#0E1220",
                  fontFamily: "Space Grotesk, sans-serif",
                  fontSize: "16px",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Try again
              </button>
              <button
                onClick={onBack}
                className="w-full py-3 rounded-xl active:scale-95 transition-transform"
                style={{
                  background: "#1F2440",
                  color: "#8B93B0",
                  fontFamily: "Inter, sans-serif",
                  fontSize: "15px",
                  border: "1px solid #2A2F4A",
                  cursor: "pointer",
                }}
              >
                Get a simpler explanation
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col" style={{ background: "#0E1220" }}>
      <div className="px-5 pt-12 pb-6">
        <div className="flex items-center justify-between mb-5">
          <button
            onClick={onBack}
            style={{
              background: "transparent",
              border: "none",
              color: "#8B93B0",
              cursor: "pointer",
              padding: 0,
            }}
          >
            ✕
          </button>
          <span
            style={{
              color: "#8B93B0",
              fontSize: "13px",
              fontFamily: "JetBrains Mono, monospace",
            }}
          >
            {qi + 1} / {questions.length}
          </span>
        </div>

        <div className="flex gap-2 mb-6">
          {questions.map((_, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: "4px",
                borderRadius: "9999px",
                background: i < qi ? "#5EEAD4" : i === qi ? "rgba(94,234,212,0.4)" : "#2A2F4A",
                transition: "background 0.3s",
              }}
            />
          ))}
        </div>

        <h2
          style={{
            fontFamily: "Space Grotesk, sans-serif",
            fontSize: "20px",
            fontWeight: 600,
            color: "#EDEFF7",
            lineHeight: 1.4,
          }}
        >
          {q.q}
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-10">
        <div className="flex flex-col gap-3">
          {q.options.map((opt, i) => {
            const isSelected = selected === i;
            const isCorrect = i === q.correct;
            const showResult = selected !== null;

            let borderColor = "#2A2F4A";
            let bgColor = "#171B2E";
            let textColor = "#EDEFF7";

            if (showResult) {
              if (isCorrect) {
                borderColor = "#5EEAD4";
                bgColor = "rgba(94,234,212,0.1)";
                textColor = "#5EEAD4";
              } else if (isSelected) {
                borderColor = "#FB7185";
                bgColor = "rgba(251,113,133,0.1)";
                textColor = "#FB7185";
              }
            } else if (isSelected) {
              borderColor = "#5EEAD4";
              bgColor = "rgba(94,234,212,0.08)";
            }

            return (
              <button
                key={i}
                onClick={() => handleSelect(i)}
                className="w-full text-left rounded-2xl px-4 py-4 transition-all active:scale-98"
                style={{
                  background: bgColor,
                  border: `1px solid ${borderColor}`,
                  color: textColor,
                  fontFamily: "Inter, sans-serif",
                  fontSize: "15px",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  lineHeight: 1.5,
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    width: "24px",
                    height: "24px",
                    borderRadius: "9999px",
                    background: isSelected ? borderColor : "#2A2F4A",
                    color: isSelected ? "#0E1220" : "#8B93B0",
                    fontSize: "12px",
                    fontWeight: 700,
                    textAlign: "center",
                    lineHeight: "24px",
                    marginRight: "12px",
                    flexShrink: 0,
                    verticalAlign: "middle",
                    transition: "all 0.2s",
                  }}
                >
                  {["A", "B", "C", "D"][i]}
                </span>
                {opt}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
