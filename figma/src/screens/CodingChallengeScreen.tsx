import { useState } from "react";

const problem = {
  title: "Reverse a Linked List",
  difficulty: "Easy",
  description:
    "Given the head of a singly linked list, reverse the list, and return the reversed list.",
  examples: [
    { input: "head = [1, 2, 3, 4, 5]", output: "[5, 4, 3, 2, 1]" },
    { input: "head = [1, 2]", output: "[2, 1]" },
  ],
  constraints: ["0 ≤ number of nodes ≤ 5000", "−5000 ≤ Node.val ≤ 5000"],
};

const defaultCode = `class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

def reverseList(head: ListNode) -> ListNode:
    # Your solution here
    prev = None
    curr = head
    while curr:
        next_node = curr.next
        curr.next = prev
        prev = curr
        curr = next_node
    return prev`;

type TestResult = { input: string; expected: string; got: string; passed: boolean };

const testResults: TestResult[] = [
  { input: "[1,2,3,4,5]", expected: "[5,4,3,2,1]", got: "[5,4,3,2,1]", passed: true },
  { input: "[1,2]", expected: "[2,1]", got: "[2,1]", passed: true },
  { input: "[]", expected: "[]", got: "[]", passed: true },
  { input: "[1]", expected: "[1]", got: "[1]", passed: true },
];

const langs = ["Python", "JavaScript", "TypeScript", "Go"];

export default function CodingChallengeScreen({
  onSolve,
  onBack,
}: {
  onSolve: () => void;
  onBack: () => void;
}) {
  const [lang, setLang] = useState("Python");
  const [code, setCode] = useState(defaultCode);
  const [ran, setRan] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [running, setRunning] = useState(false);

  const handleRun = () => {
    setRunning(true);
    setTimeout(() => {
      setRunning(false);
      setRan(true);
    }, 1200);
  };

  const handleSubmit = () => {
    setRunning(true);
    setTimeout(() => {
      setRunning(false);
      setRan(true);
      setSubmitted(true);
      setTimeout(onSolve, 1000);
    }, 1400);
  };

  const diffColor =
    problem.difficulty === "Easy"
      ? "#5EEAD4"
      : problem.difficulty === "Medium"
      ? "#FBBF24"
      : "#FB7185";

  return (
    <div className="h-full flex flex-col" style={{ background: "#0E1220" }}>
      <div className="px-5 pt-12 pb-3 flex items-center gap-3">
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
        <div className="flex-1">
          <h1
            style={{
              fontFamily: "Space Grotesk, sans-serif",
              fontSize: "17px",
              fontWeight: 700,
              color: "#EDEFF7",
            }}
          >
            {problem.title}
          </h1>
          <span
            style={{
              background: `${diffColor}20`,
              color: diffColor,
              fontSize: "11px",
              fontWeight: 700,
              padding: "2px 8px",
              borderRadius: "9999px",
              display: "inline-block",
              marginTop: "2px",
            }}
          >
            {problem.difficulty}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-5 pb-4">
          <p style={{ color: "#EDEFF7", fontSize: "14px", lineHeight: 1.6, marginBottom: "12px" }}>
            {problem.description}
          </p>

          {problem.examples.map((ex, i) => (
            <div
              key={i}
              className="rounded-xl p-3 mb-2"
              style={{ background: "#171B2E", border: "1px solid #2A2F4A" }}
            >
              <p style={{ color: "#8B93B0", fontSize: "12px", marginBottom: "6px" }}>
                Example {i + 1}
              </p>
              <code
                style={{
                  fontFamily: "JetBrains Mono, monospace",
                  fontSize: "12px",
                  color: "#EDEFF7",
                  display: "block",
                  lineHeight: 1.7,
                }}
              >
                <span style={{ color: "#8B93B0" }}>Input: </span>{ex.input}
                {"\n"}
                <span style={{ color: "#8B93B0" }}>Output: </span>{ex.output}
              </code>
            </div>
          ))}
        </div>

        <div className="px-5 pb-3">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {langs.map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                style={{
                  background: lang === l ? "rgba(94,234,212,0.15)" : "#1F2440",
                  color: lang === l ? "#5EEAD4" : "#8B93B0",
                  border: `1px solid ${lang === l ? "rgba(94,234,212,0.4)" : "#2A2F4A"}`,
                  borderRadius: "9999px",
                  padding: "5px 14px",
                  fontSize: "13px",
                  fontFamily: "Inter, sans-serif",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  transition: "all 0.2s",
                }}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        <div
          className="mx-5 rounded-2xl overflow-hidden"
          style={{ border: "1px solid #2A2F4A" }}
        >
          <div
            className="flex items-center justify-between px-4 py-2"
            style={{ background: "#171B2E", borderBottom: "1px solid #2A2F4A" }}
          >
            <span
              style={{
                fontFamily: "JetBrains Mono, monospace",
                fontSize: "12px",
                color: "#8B93B0",
              }}
            >
              {lang.toLowerCase()}{lang === "JavaScript" ? ".js" : lang === "TypeScript" ? ".ts" : lang === "Go" ? ".go" : ".py"}
            </span>
            <div className="flex gap-1">
              {["#FB7185", "#FBBF24", "#5EEAD4"].map((c) => (
                <div key={c} style={{ width: "8px", height: "8px", borderRadius: "9999px", background: c, opacity: 0.5 }} />
              ))}
            </div>
          </div>

          <div style={{ position: "relative" }}>
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                bottom: 0,
                width: "40px",
                background: "#0A0D1A",
                borderRight: "1px solid #1A1F35",
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                paddingTop: "14px",
                paddingRight: "8px",
                pointerEvents: "none",
                zIndex: 1,
              }}
            >
              {code.split("\n").map((_, i) => (
                <div
                  key={i}
                  style={{
                    fontFamily: "JetBrains Mono, monospace",
                    fontSize: "12px",
                    color: "#4A5268",
                    lineHeight: "1.6",
                    height: "19.2px",
                  }}
                >
                  {i + 1}
                </div>
              ))}
            </div>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              style={{
                background: "#0A0D1A",
                color: "#EDEFF7",
                fontFamily: "JetBrains Mono, monospace",
                fontSize: "13px",
                lineHeight: 1.6,
                padding: "14px 14px 14px 54px",
                width: "100%",
                minHeight: "220px",
                border: "none",
                outline: "none",
                resize: "none",
                display: "block",
              }}
              spellCheck={false}
            />
          </div>
        </div>

        {ran && (
          <div className="mx-5 mt-4 mb-2">
            <p
              style={{
                fontFamily: "Space Grotesk, sans-serif",
                fontSize: "14px",
                fontWeight: 600,
                color: "#EDEFF7",
                marginBottom: "10px",
              }}
            >
              Test Results
            </p>
            <div className="flex flex-col gap-2">
              {testResults.map((t, i) => (
                <div
                  key={i}
                  className="rounded-xl p-3 flex items-start gap-3"
                  style={{
                    background: t.passed ? "rgba(94,234,212,0.06)" : "rgba(251,113,133,0.06)",
                    border: `1px solid ${t.passed ? "rgba(94,234,212,0.25)" : "rgba(251,113,133,0.25)"}`,
                  }}
                >
                  <div
                    style={{
                      width: "18px",
                      height: "18px",
                      borderRadius: "9999px",
                      background: t.passed ? "#5EEAD4" : "#FB7185",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      marginTop: "1px",
                    }}
                  >
                    {t.passed ? (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#0E1220" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    ) : (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#0E1220" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    )}
                  </div>
                  <div>
                    <code
                      style={{
                        fontFamily: "JetBrains Mono, monospace",
                        fontSize: "12px",
                        color: "#8B93B0",
                        display: "block",
                        lineHeight: 1.6,
                      }}
                    >
                      Input: {t.input}
                      {"\n"}Expected: {t.expected}
                      {"\n"}Got: <span style={{ color: t.passed ? "#5EEAD4" : "#FB7185" }}>{t.got}</span>
                    </code>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3 px-5 py-4 mb-2">
          <button
            onClick={handleRun}
            disabled={running}
            className="flex-1 py-3 rounded-xl font-medium active:scale-95 transition-transform"
            style={{
              background: "#1F2440",
              color: "#EDEFF7",
              border: "1px solid #2A2F4A",
              fontFamily: "Inter, sans-serif",
              fontSize: "14px",
              cursor: running ? "default" : "pointer",
            }}
          >
            {running ? "Running…" : "▶ Run"}
          </button>
          <button
            onClick={handleSubmit}
            disabled={running}
            className="flex-1 py-3 rounded-xl font-semibold active:scale-95 transition-transform"
            style={{
              background: submitted ? "#5EEAD4" : ran ? "#5EEAD4" : "#2A2F4A",
              color: "#0E1220",
              border: "none",
              fontFamily: "Inter, sans-serif",
              fontSize: "14px",
              cursor: running ? "default" : "pointer",
              boxShadow: ran ? "0 0 20px rgba(94,234,212,0.3)" : "none",
            }}
          >
            {running ? "Judging…" : submitted ? "✓ Accepted" : "Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}
