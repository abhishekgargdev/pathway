"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

type CodeBlockProps = {
  code: string;
  language?: string;
  className?: string;
};

export function CodeBlock({ code, language = "code", className }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement("textarea");
      textarea.value = code;
      textarea.style.position = "fixed";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        console.error("Failed to copy code block content.");
      }
      document.body.removeChild(textarea);
    }
  }

  return (
    <div
      className={cn(
        "my-4 overflow-hidden rounded-xl border border-[#2A2F4A] bg-[#1F2440] shadow-[0_4px_16px_rgba(0,0,0,0.25)]",
        className,
      )}
    >
      {/* Code Header bar */}
      <div className="flex items-center justify-between border-b border-[#2A2F4A] bg-white/[0.02] px-4 py-2">
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.5px] text-[#8B93B0]">
          {language}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-[#8B93B0] transition-colors",
            "hover:bg-white/[0.04] hover:text-[#EDEFF7]",
            "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#5EEAD4]/40",
          )}
          aria-label={copied ? "Code copied to clipboard" : "Copy code to clipboard"}
        >
          {copied ? (
            <>
              <Check className="size-3.5 text-[#5EEAD4]" />
              <span className="text-[#5EEAD4]">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="size-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code scroll content */}
      <pre className="overflow-x-auto p-4 font-mono text-[12px] leading-relaxed text-[#EDEFF7] outline-none">
        <code className="block select-text font-mono">{code}</code>
      </pre>
    </div>
  );
}
