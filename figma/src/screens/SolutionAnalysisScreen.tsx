import { useState } from "react";

const mySolution = {
  complexity: { time: "O(n)", space: "O(1)" },
  feedback:
    "Clean iterative in-place reversal. You correctly updated prev → curr → next_node in one pass. This is the optimal approach.",
  rating: 5,
};

const altSolutions = [
  {
    title: "Recursive",
    tags: ["Recursion", "Divide & Conquer"],
    complexity: { time: "O(n)", space: "O(n)" },
    code: `def reverseList(head):
    if not head or not head.next:
        return head
    rest = reverseList(head.next)
    head.next.next = head
    head.next = None
    return rest`,
    note: "Elegant, but O(n) stack space. Can hit stack overflow on very long lists.",
  },
  {
    title: "Stack-based",
    tags: ["Stack", "Iterative"],
    complexity: { time: "O(n)", space: "O(n)" },
    code: `def reverseList(head):
    stack, cur = [], head
    while cur:
        stack.append(cur.val)
        cur = cur.next
    dummy = ListNode(0)
    cur = dummy
    while stack:
        cur.next = ListNode(stack.pop())
        cur = cur.next
    return dummy.next`,
    note: "Readable but creates new nodes. Extra O(n) memory and object allocations.",
  },
  {
    title: "Two-pass (collect + rebuild)",
    tags: ["Array", "Linear scan"],
    complexity: { time: "O(n)", space: "O(n)" },
    code: `def reverseList(head):
    vals = []
    cur = head
    while cur:
        vals.append(cur.val)
        cur = cur.next
    cur = head
    for v in reversed(vals):
        cur.val = v
        cur = cur.next
    return head`,
    note: "Mutates values in-place without changing pointers. Unusual but valid.",
  },
  {
    title: "Doubly-linked reuse",
    tags: ["OOP", "Pointer manipulation"],
    complexity: { time: "O(n)", space: "O(1)" },
    code: `def reverseList(head):
    cur = head
    while cur:
        cur.prev, cur.next = cur.next, cur.prev
        cur = cur.prev  # was .next before swap
    return head`,
    note: "Assumes doubly-linked nodes. Same O(1) space as iterative, adapted for prev pointers.",
  },
  {
    title: "Sentinel / dummy node",
    tags: ["Sentinel", "List reordering"],
    complexity: { time: "O(n)", space: "O(1)" },
    code: `def reverseList(head):
    dummy = ListNode(0)
    while head:
        nxt = head.next
        head.next = dummy.next
        dummy.next = head
        head = nxt
    return dummy.next`,
    note: "Prepend each node to a dummy list. Equivalent to iterative, marginally more explicit.",
  },
];

function ComplexityBadge({ label, value }: { label: string; value: string }) {
  return (
    <span
      style={{
        background: "#1F2440",
        border: "1px solid #2A2F4A",
        borderRadius: "9999px",
        padding: "3px 10px",
        fontSize: "12px",
        fontFamily: "JetBrains Mono, monospace",
        color: "#5EEAD4",
        display: "inline-flex",
        alignItems: "center",
        gap: "5px",
      }}
    >
      <span style={{ color: "#8B93B0" }}>{label}</span> {value}
    </span>
  );
}

function TagPill({ label }: { label: string }) {
  return (
    <span
      style={{
        background: "rgba(139,124,246,0.15)",
        border: "1px solid rgba(139,124,246,0.3)",
        borderRadius: "9999px",
        padding: "2px 9px",
        fontSize: "11px",
        fontFamily: "Inter, sans-serif",
        color: "#8B7CF6",
        fontWeight: 500,
      }}
    >
      {label}
    </span>
  );
}

export default function SolutionAnalysisScreen({ onDone }: { onDone: () => void }) {
  const [activeAlt, setActiveAlt] = useState(0);

  return (
    <div className="h-full flex flex-col" style={{ background: "#0E1220" }}>
      <div className="px-5 pt-12 pb-4">
        <h1
          style={{
            fontFamily: "Space Grotesk, sans-serif",
            fontSize: "22px",
            fontWeight: 700,
            color: "#EDEFF7",
            marginBottom: "4px",
          }}
        >
          Solution Analysis
        </h1>
        <p style={{ color: "#8B93B0", fontSize: "14px" }}>
          Reverse a Linked List
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-6">
        <div
          className="rounded-2xl p-5 mb-6"
          style={{
            background: "rgba(94,234,212,0.06)",
            border: "1px solid rgba(94,234,212,0.25)",
            boxShadow: "0 0 20px rgba(94,234,212,0.06)",
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "9999px",
                background: "#5EEAD4",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0E1220" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <span
              style={{
                fontFamily: "Space Grotesk, sans-serif",
                fontSize: "16px",
                fontWeight: 600,
                color: "#EDEFF7",
              }}
            >
              Your solution
            </span>
            <div className="flex ml-auto">
              {Array.from({ length: 5 }).map((_, i) => (
                <span key={i} style={{ color: i < mySolution.rating ? "#FBBF24" : "#2A2F4A", fontSize: "14px" }}>★</span>
              ))}
            </div>
          </div>

          <p style={{ color: "#EDEFF7", fontSize: "14px", lineHeight: 1.6, marginBottom: "12px" }}>
            {mySolution.feedback}
          </p>

          <div className="flex gap-2 flex-wrap">
            <ComplexityBadge label="Time" value={mySolution.complexity.time} />
            <ComplexityBadge label="Space" value={mySolution.complexity.space} />
          </div>
        </div>

        <h2
          style={{
            fontFamily: "Space Grotesk, sans-serif",
            fontSize: "16px",
            fontWeight: 600,
            color: "#EDEFF7",
            marginBottom: "12px",
          }}
        >
          5 alternative solutions
        </h2>

        <div className="flex gap-2 overflow-x-auto pb-3 mb-4">
          {altSolutions.map((s, i) => (
            <button
              key={i}
              onClick={() => setActiveAlt(i)}
              style={{
                background: activeAlt === i ? "rgba(94,234,212,0.12)" : "#1F2440",
                color: activeAlt === i ? "#5EEAD4" : "#8B93B0",
                border: `1px solid ${activeAlt === i ? "rgba(94,234,212,0.4)" : "#2A2F4A"}`,
                borderRadius: "9999px",
                padding: "6px 14px",
                fontSize: "13px",
                fontFamily: "Inter, sans-serif",
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all 0.2s",
              }}
            >
              {i + 1}. {s.title}
            </button>
          ))}
        </div>

        {(() => {
          const s = altSolutions[activeAlt];
          return (
            <div
              className="rounded-2xl overflow-hidden animate-fade-in"
              style={{ border: "1px solid #2A2F4A" }}
            >
              <div
                className="px-5 pt-4 pb-3"
                style={{ background: "#171B2E" }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    style={{
                      fontFamily: "Space Grotesk, sans-serif",
                      fontSize: "16px",
                      fontWeight: 600,
                      color: "#EDEFF7",
                    }}
                  >
                    {s.title}
                  </span>
                  <div className="flex gap-2">
                    <ComplexityBadge label="T" value={s.complexity.time} />
                    <ComplexityBadge label="S" value={s.complexity.space} />
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {s.tags.map((t) => (
                    <TagPill key={t} label={t} />
                  ))}
                </div>
              </div>

              <pre
                style={{
                  fontFamily: "JetBrains Mono, monospace",
                  fontSize: "12.5px",
                  color: "#EDEFF7",
                  padding: "16px",
                  background: "#0A0D1A",
                  overflowX: "auto",
                  margin: 0,
                  lineHeight: 1.65,
                }}
              >
                <code>{s.code}</code>
              </pre>

              <div
                className="px-5 py-4"
                style={{ background: "#171B2E", borderTop: "1px solid #2A2F4A" }}
              >
                <p style={{ color: "#8B93B0", fontSize: "13px", lineHeight: 1.5 }}>
                  {s.note}
                </p>
              </div>
            </div>
          );
        })()}

        <button
          onClick={onDone}
          className="w-full py-4 rounded-xl font-semibold mt-6 active:scale-95 transition-transform"
          style={{
            background: "#5EEAD4",
            color: "#0E1220",
            fontFamily: "Space Grotesk, sans-serif",
            fontSize: "16px",
            border: "none",
            cursor: "pointer",
            boxShadow: "0 0 20px rgba(94,234,212,0.25)",
          }}
        >
          Back to dashboard
        </button>
      </div>
    </div>
  );
}
