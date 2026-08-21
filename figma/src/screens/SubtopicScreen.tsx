import { useState, useRef } from "react";

const content = `
## What is a Linked List?

A **linked list** is a linear data structure where elements are stored in nodes, and each node points to the next. Unlike arrays, linked lists don't require contiguous memory allocation.

Each node contains:
- A **value** (data)
- A **pointer** to the next node

### Types of Linked Lists

| Type | Description |
|------|-------------|
| Singly | Each node points to the next |
| Doubly | Each node has next and prev pointers |
| Circular | Last node points to head |

### Basic Implementation

Here's a singly linked list in Python:
`;

const codeExample = `class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

class LinkedList:
    def __init__(self):
        self.head = None

    def append(self, val: int) -> None:
        node = ListNode(val)
        if not self.head:
            self.head = node
            return
        cur = self.head
        while cur.next:
            cur = cur.next
        cur.next = node

    def traverse(self) -> list[int]:
        result, cur = [], self.head
        while cur:
            result.append(cur.val)
            cur = cur.next
        return result`;

const afterCode = `
### Time Complexities

- **Access**: \`O(n)\` — must traverse from head
- **Search**: \`O(n)\` — linear scan
- **Insert at head**: \`O(1)\` — just update pointer
- **Insert at tail**: \`O(n)\` without tail reference
- **Delete**: \`O(n)\` to find, \`O(1)\` to remove

### Key patterns to know

**Fast & Slow Pointers** — used to detect cycles and find the middle node in \`O(n)\` time and \`O(1)\` space.

**In-place reversal** — flip the list by reassigning pointers without extra memory. Fundamental to many interview questions.
`;

export default function SubtopicScreen({
  onQuiz,
  onBack,
}: {
  onQuiz: () => void;
  onBack: () => void;
}) {
  const [showQuizBtn, setShowQuizBtn] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    setShowQuizBtn(nearBottom);
  };

  const renderInlineCode = (text: string) => {
    const parts = text.split(/(`[^`]+`)/g);
    return parts.map((part, i) =>
      part.startsWith("`") && part.endsWith("`") ? (
        <code
          key={i}
          style={{
            fontFamily: "JetBrains Mono, monospace",
            fontSize: "13px",
            background: "rgba(94,234,212,0.1)",
            color: "#5EEAD4",
            padding: "1px 5px",
            borderRadius: "4px",
          }}
        >
          {part.slice(1, -1)}
        </code>
      ) : (
        <span key={i}>{part}</span>
      )
    );
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
          <p style={{ color: "#5EEAD4", fontSize: "12px", fontWeight: 500 }}>
            Linked Lists · Topic 5 of 18
          </p>
          <h1
            style={{
              fontFamily: "Space Grotesk, sans-serif",
              fontSize: "18px",
              fontWeight: 700,
              color: "#EDEFF7",
            }}
          >
            Introduction & Traversal
          </h1>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-5 pb-32"
        onScroll={handleScroll}
      >
        <div style={{ color: "#EDEFF7", fontSize: "15px", lineHeight: 1.7 }}>
          {content.split("\n").map((line, i) => {
            if (line.startsWith("## "))
              return (
                <h2
                  key={i}
                  style={{
                    fontFamily: "Space Grotesk, sans-serif",
                    fontSize: "22px",
                    fontWeight: 700,
                    color: "#EDEFF7",
                    margin: "20px 0 12px",
                  }}
                >
                  {line.replace("## ", "")}
                </h2>
              );
            if (line.startsWith("### "))
              return (
                <h3
                  key={i}
                  style={{
                    fontFamily: "Space Grotesk, sans-serif",
                    fontSize: "17px",
                    fontWeight: 600,
                    color: "#EDEFF7",
                    margin: "20px 0 8px",
                  }}
                >
                  {line.replace("### ", "")}
                </h3>
              );
            if (line.startsWith("- "))
              return (
                <li key={i} style={{ color: "#EDEFF7", marginLeft: "16px", marginBottom: "4px" }}>
                  {renderInlineCode(line.replace(/^- \*\*(.*?)\*\*/, (_, m) => `**${m}**`).replace(/\*\*(.*?)\*\*/g, "$1"))}
                </li>
              );
            if (line.startsWith("|"))
              return null;
            if (line.trim() === "") return <div key={i} style={{ height: "8px" }} />;
            return (
              <p key={i} style={{ marginBottom: "8px" }}>
                {renderInlineCode(line.replace(/\*\*(.*?)\*\*/g, "$1"))}
              </p>
            );
          })}

          <div
            className="rounded-2xl overflow-hidden my-4"
            style={{
              background: "#0A0D1A",
              border: "1px solid #2A2F4A",
            }}
          >
            <div
              className="flex items-center justify-between px-4 py-2"
              style={{
                background: "#171B2E",
                borderBottom: "1px solid #2A2F4A",
              }}
            >
              <span
                style={{
                  fontFamily: "JetBrains Mono, monospace",
                  fontSize: "12px",
                  color: "#8B93B0",
                }}
              >
                python
              </span>
              <span style={{ color: "#8B93B0", fontSize: "12px" }}>linked_list.py</span>
            </div>
            <pre
              style={{
                fontFamily: "JetBrains Mono, monospace",
                fontSize: "13px",
                color: "#EDEFF7",
                padding: "16px",
                overflowX: "auto",
                margin: 0,
                lineHeight: 1.6,
              }}
            >
              <code>
                {codeExample.split("\n").map((line, i) => {
                  let colored = line
                    .replace(/(class|def|return|while|if|not)\b/g, '<span style="color:#8B7CF6">$1</span>')
                    .replace(/(self|None|True|False)\b/g, '<span style="color:#5EEAD4">$1</span>')
                    .replace(/(->|:)/g, '<span style="color:#FB7185">$1</span>')
                    .replace(/(#.*)/g, '<span style="color:#4A5268">$1</span>')
                    .replace(/("[^"]*"|'[^']*')/g, '<span style="color:#FBBF24">$1</span>');
                  return (
                    <div key={i} dangerouslySetInnerHTML={{ __html: colored }} />
                  );
                })}
              </code>
            </pre>
          </div>

          {afterCode.split("\n").map((line, i) => {
            if (line.startsWith("### "))
              return (
                <h3
                  key={i}
                  style={{
                    fontFamily: "Space Grotesk, sans-serif",
                    fontSize: "17px",
                    fontWeight: 600,
                    color: "#EDEFF7",
                    margin: "20px 0 8px",
                  }}
                >
                  {line.replace("### ", "")}
                </h3>
              );
            if (line.startsWith("- "))
              return (
                <li key={i} style={{ color: "#EDEFF7", marginLeft: "16px", marginBottom: "6px" }}>
                  {renderInlineCode(line.replace("- ", "").replace(/\*\*(.*?)\*\*/g, "$1"))}
                </li>
              );
            if (line.trim() === "") return <div key={i} style={{ height: "6px" }} />;
            return (
              <p key={i} style={{ marginBottom: "8px" }}>
                {renderInlineCode(line.replace(/\*\*(.*?)\*\*/g, "$1"))}
              </p>
            );
          })}
        </div>

        {!showQuizBtn && (
          <div
            className="flex items-center gap-2 mt-6 py-3"
            style={{ color: "#8B93B0", fontSize: "13px" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12l7 7 7-7"/>
            </svg>
            Scroll to finish
          </div>
        )}
      </div>

      <div
        className="px-5 pb-5 pt-3"
        style={{
          background: "linear-gradient(to top, #0E1220 70%, transparent)",
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          transition: "opacity 0.3s",
          opacity: showQuizBtn ? 1 : 0,
          pointerEvents: showQuizBtn ? "auto" : "none",
        }}
      >
        <button
          onClick={onQuiz}
          className="w-full py-4 rounded-xl font-semibold transition-all active:scale-95"
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
          Take the quiz →
        </button>
      </div>
    </div>
  );
}
