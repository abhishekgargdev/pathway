"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

import { cn } from "@/lib/utils";

const components: Components = {
  h1: ({ children }) => (
    <h1 className="mt-6 mb-3 font-heading text-xl font-bold text-[#EDEFF7] first:mt-0">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="mt-6 mb-2.5 font-heading text-lg font-bold text-[#EDEFF7] first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-5 mb-2 font-heading text-base font-semibold text-[#EDEFF7]">
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p className="mb-3 text-[15px] leading-relaxed text-[#EDEFF7]/90">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="mb-3 list-disc space-y-1.5 pl-5 text-[15px] text-[#EDEFF7]/90">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-3 list-decimal space-y-1.5 pl-5 text-[15px] text-[#EDEFF7]/90">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  strong: ({ children }) => (
    <strong className="font-semibold text-[#EDEFF7]">{children}</strong>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      className="text-[#5EEAD4] underline-offset-2 hover:underline"
      target="_blank"
      rel="noreferrer"
    >
      {children}
    </a>
  ),
  code: ({ className, children, ...props }) => {
    const isBlock = Boolean(className?.includes("language-"));
    if (!isBlock) {
      return (
        <code
          className="rounded px-1.5 py-0.5 font-mono text-[13px] text-[#5EEAD4] bg-[#5EEAD4]/10"
          {...props}
        >
          {children}
        </code>
      );
    }
    return (
      <code className={cn("font-mono text-[12px] leading-relaxed text-[#EDEFF7]", className)} {...props}>
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="mb-4 overflow-x-auto rounded-xl border border-[#2A2F4A] bg-[#1F2440] p-4 font-mono text-[12px] leading-relaxed text-[#EDEFF7]">
      {children}
    </pre>
  ),
  table: ({ children }) => (
    <div className="mb-4 overflow-x-auto rounded-xl border border-[#2A2F4A]">
      <table className="w-full min-w-[280px] border-collapse text-left text-sm">
        {children}
      </table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border-b border-[#2A2F4A] bg-[#1F2440] px-3 py-2 font-heading font-semibold text-[#EDEFF7]">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border-b border-[#2A2F4A]/60 px-3 py-2 text-[#8B93B0]">
      {children}
    </td>
  ),
  blockquote: ({ children }) => (
    <blockquote className="mb-3 border-l-2 border-[#5EEAD4]/50 pl-3 text-[#8B93B0]">
      {children}
    </blockquote>
  ),
};

export function MarkdownContent({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0 break-words", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
