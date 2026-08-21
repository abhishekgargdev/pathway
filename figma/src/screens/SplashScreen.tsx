import { useEffect, useState } from "react";
import PathwayLogo from "../components/PathwayLogo";

const NODE_COUNT = 5;

export default function SplashScreen({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const [dotPos, setDotPos] = useState(0);

  useEffect(() => {
    const intervals: ReturnType<typeof setInterval>[] = [];
    for (let i = 0; i < NODE_COUNT; i++) {
      intervals.push(
        setTimeout(() => setStep(i + 1), 300 + i * 400)
      );
    }
    const dotTimer = setInterval(() => {
      setDotPos((p) => (p + 1) % NODE_COUNT);
    }, 350);
    const done = setTimeout(onDone, 3200);
    return () => {
      intervals.forEach(clearTimeout);
      clearInterval(dotTimer);
      clearTimeout(done);
    };
  }, []);

  const nodes = [
    { x: 160, y: 60 },
    { x: 200, y: 120 },
    { x: 140, y: 180 },
    { x: 200, y: 240 },
    { x: 160, y: 300 },
  ];

  return (
    <div
      className="flex flex-col items-center justify-center h-full"
      style={{ background: "#0E1220" }}
    >
      <svg width="320" height="360" style={{ overflow: "visible" }}>
        <defs>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5EEAD4" />
            <stop offset="100%" stopColor="#8B7CF6" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {nodes.slice(0, -1).map((node, i) => {
          const next = nodes[i + 1];
          const filled = step > i + 1;
          return (
            <line
              key={i}
              x1={node.x}
              y1={node.y}
              x2={next.x}
              y2={next.y}
              stroke={filled ? "url(#lineGrad)" : "#2A2F4A"}
              strokeWidth="2"
              strokeLinecap="round"
              style={{
                transition: "stroke 0.3s ease",
              }}
            />
          );
        })}

        {nodes.map((node, i) => {
          const filled = step > i;
          const isActive = step === i + 1;
          return (
            <g key={i}>
              {isActive && (
                <circle
                  cx={node.x}
                  cy={node.y}
                  r="16"
                  fill="rgba(94,234,212,0.15)"
                  filter="url(#glow)"
                />
              )}
              <circle
                cx={node.x}
                cy={node.y}
                r="10"
                fill={filled ? "#5EEAD4" : "transparent"}
                stroke={filled ? "#5EEAD4" : "#2A2F4A"}
                strokeWidth="2"
                style={{ transition: "all 0.3s ease" }}
              />
              {filled && step > i + 1 && (
                <path
                  d={`M${node.x - 4} ${node.y} l3 3 l5 -6`}
                  stroke="#0E1220"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              )}
            </g>
          );
        })}

        {step > 0 && step <= NODE_COUNT && (
          <circle
            cx={nodes[Math.min(step - 1, NODE_COUNT - 1)].x}
            cy={nodes[Math.min(step - 1, NODE_COUNT - 1)].y}
            r="6"
            fill="#5EEAD4"
            filter="url(#glow)"
            style={{ transition: "cx 0.4s ease, cy 0.4s ease" }}
          />
        )}
      </svg>

      <div className="flex flex-col items-center gap-3 mt-2 animate-slide-up">
        <PathwayLogo size={48} />
        <h1
          style={{
            fontFamily: "Space Grotesk, sans-serif",
            fontSize: "28px",
            fontWeight: 700,
            letterSpacing: "-0.5px",
            color: "#EDEFF7",
          }}
        >
          Pathway
        </h1>
        <p style={{ color: "#8B93B0", fontSize: "14px" }}>
          Your personal learning journey
        </p>
      </div>
    </div>
  );
}
