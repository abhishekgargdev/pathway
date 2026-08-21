"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, Brain, Code, Cpu, Info, Lock, RefreshCw, Layers } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";

import { CodeBlock } from "@/components/content/CodeBlock";
import { Skeleton } from "@/components/ui/skeleton";
import type { SolutionAnalysisResponse } from "@/lib/challenges/types";

async function fetchSolutionAnalysis(
  challengeId: string,
): Promise<SolutionAnalysisResponse> {
  const res = await fetch(`/api/challenges/${challengeId}/analysis`);
  const data = (await res.json()) as SolutionAnalysisResponse & { error?: string };
  if (!res.ok) {
    if (res.status === 403) {
      return { status: "forbidden", message: data.message ?? "Forbidden", analysis: null };
    }
    throw new Error(data.error ?? data.message ?? "Failed to load analysis");
  }
  return data;
}

export function SolutionAnalysisView({ challengeId }: { challengeId: string }) {
  const [activeAltIndex, setActiveAltIndex] = useState<number | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window !== "undefined") {
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }
    return false;
  });

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const listener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, []);

  const { data, isLoading, error, refetch } = useQuery<SolutionAnalysisResponse, Error>({
    queryKey: ["solutionAnalysis", challengeId],
    queryFn: () => fetchSolutionAnalysis(challengeId),
    retry: 1,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const animVariants: any = prefersReducedMotion
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1, transition: { duration: 0.1 } },
      }
    : {
        initial: { opacity: 0, y: 15 },
        animate: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 25 } },
      };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0E1220] p-6 text-[#EDEFF7] md:p-10">
        <div className="mx-auto max-w-7xl space-y-8">
          <div className="h-6 w-32 animate-pulse rounded bg-[#171B2E]" />
          <div className="space-y-4">
            <Skeleton className="h-10 w-2/3 bg-[#171B2E]" />
            <Skeleton className="h-6 w-1/2 bg-[#171B2E]" />
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            <Skeleton className="h-32 bg-[#171B2E]" />
            <Skeleton className="h-32 bg-[#171B2E]" />
            <Skeleton className="h-32 bg-[#171B2E]" />
          </div>
          <Skeleton className="h-[400px] w-full bg-[#171B2E]" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0E1220] p-6 text-center text-[#EDEFF7]">
        <div className="max-w-md space-y-6">
          <div className="inline-flex size-16 items-center justify-center rounded-full bg-[#FB7185]/10 text-[#FB7185]">
            <Lock className="size-8" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-[#EDEFF7]">
            Failed to Load Analysis
          </h2>
          <p className="text-sm text-[#8B93B0]">
            {error?.message ?? "An error occurred while loading the solution analysis."}
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              onClick={() => refetch()}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#5EEAD4] px-5 py-2.5 text-sm font-semibold text-[#0E1220] hover:bg-[#5EEAD4]/80 focus:outline-none focus:ring-2 focus:ring-[#5EEAD4]/40"
            >
              <RefreshCw className="size-4" />
              Try Again
            </button>
            <Link
              href={`/challenges/${challengeId}`}
              className="inline-flex items-center justify-center rounded-xl bg-[#171B2E] px-5 py-2.5 text-sm font-semibold text-[#8B93B0] hover:bg-[#1F2440] hover:text-[#EDEFF7] focus:outline-none"
            >
              Back to Challenge
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (data.status === "forbidden") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0E1220] p-6 text-center text-[#EDEFF7]">
        <div className="max-w-md space-y-6">
          <div className="inline-flex size-16 items-center justify-center rounded-full bg-[#FBBF24]/10 text-[#FBBF24]">
            <Lock className="size-8" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-[#EDEFF7]">
            Analysis Locked
          </h2>
          <p className="text-sm text-[#8B93B0]">
            Pass all test cases to unlock solution analysis.
          </p>
          <Link
            href={`/challenges/${challengeId}`}
            className="inline-flex items-center justify-center rounded-xl bg-[#5EEAD4] px-5 py-2.5 text-sm font-semibold text-[#0E1220] hover:bg-[#5EEAD4]/80 focus:outline-none focus:ring-2 focus:ring-[#5EEAD4]/40"
          >
            Go to Coding Workspace
          </Link>
        </div>
      </div>
    );
  }

  if (data.status === "ready_tomorrow") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0E1220] p-6 text-center text-[#EDEFF7]">
        <div className="max-w-md space-y-6">
          <div className="inline-flex size-16 items-center justify-center rounded-full bg-[#5EEAD4]/10 text-[#5EEAD4]">
            <Brain className="size-8" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-[#EDEFF7]">
            Analysis in Progress
          </h2>
          <p className="text-sm text-[#8B93B0]">
            This lesson analysis is queued and will be ready in tomorrow&apos;s batch.
          </p>
          <Link
            href={`/challenges/${challengeId}`}
            className="inline-flex items-center justify-center rounded-xl bg-[#171B2E] px-5 py-2.5 text-sm font-semibold text-[#8B93B0] hover:bg-[#1F2440] hover:text-[#EDEFF7] focus:outline-none"
          >
            Back to Challenge
          </Link>
        </div>
      </div>
    );
  }

  if (data.status === "generating") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0E1220] p-6 text-center text-[#EDEFF7]">
        <div className="max-w-md space-y-6">
          <RefreshCw className="mx-auto size-12 animate-spin text-[#5EEAD4]" />
          <h2 className="text-xl font-bold tracking-tight text-[#EDEFF7]">
            Analyzing Your Solution...
          </h2>
          <p className="text-sm text-[#8B93B0]">
            Our AI engine is currently performing complexity evaluations and comparing algorithmic designs.
          </p>
        </div>
      </div>
    );
  }

  const analysis = data.analysis;
  if (!analysis) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0E1220] p-6 text-center text-[#EDEFF7]">
        <div className="max-w-md space-y-6">
          <p className="text-sm text-[#8B93B0]">No analysis data could be retrieved.</p>
          <Link
            href={`/challenges/${challengeId}`}
            className="inline-flex items-center justify-center rounded-xl bg-[#5EEAD4] px-5 py-2.5 text-sm font-semibold text-[#0E1220]"
          >
            Back to Workspace
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0E1220] p-6 text-[#EDEFF7] md:p-10">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Navigation Breadcrumb Header */}
        <div className="flex items-center justify-between">
          <Link
            href={`/challenges/${challengeId}`}
            className="group inline-flex items-center gap-2 text-sm font-semibold text-[#8B93B0] hover:text-[#EDEFF7] transition-colors"
          >
            <ArrowLeft className="size-4 group-hover:-translate-x-0.5 transition-transform" />
            Back to Coding Challenge
          </Link>
          <span className="text-xs text-[#8B93B0]">
            Generated: {new Date(analysis.generatedAt).toLocaleDateString()}
          </span>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h1 className="font-space text-3xl font-bold tracking-tight text-[#EDEFF7] md:text-4xl">
            Solution Analysis
          </h1>
          <p className="text-sm text-[#8B93B0] max-w-2xl">
            Compare your successful submission parameters against alternative software engineering approaches.
          </p>
        </div>

        {/* AI Disclaimer Banner */}
        <div className="flex items-start gap-3 rounded-2xl border border-[#FBBF24]/20 bg-[#FBBF24]/5 p-4 text-[#FBBF24]">
          <Info className="mt-0.5 size-5 shrink-0" />
          <div className="text-xs leading-relaxed">
            <span className="font-bold uppercase tracking-wider">AI Disclaimer:</span> Complexity mappings, resource consumption estimates, and architectural critiques are generated by AI. They are meant for educational guidance and do not represent mathematical certainty.
          </div>
        </div>

        {/* User Submission Analysis */}
        <motion.div
          variants={animVariants}
          initial="initial"
          animate="animate"
          className="space-y-6"
        >
          <div className="flex items-center gap-2 border-b border-[#2A2F4A]/30 pb-3">
            <Cpu className="size-5 text-[#5EEAD4]" />
            <h2 className="font-space text-xl font-bold text-[#EDEFF7]">Your Solution</h2>
          </div>

          <div className="grid gap-6 md:grid-cols-12">
            {/* Left: Code Box */}
            <div className="md:col-span-7">
              <CodeBlock
                code={analysis.submission.code}
                language={analysis.submission.language}
                className="mt-0 shadow-lg shadow-teal-500/[0.02]"
              />
            </div>

            {/* Right: Metrics & Feedback */}
            <div className="space-y-6 md:col-span-5">
              {/* Complexities Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-2xl bg-[#171B2E] border border-[#2A2F4A]/40 p-4 hover:border-[#5EEAD4]/30 transition-all shadow-md">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#8B93B0]">Time Complexity</span>
                  <div className="mt-1 font-mono text-xl font-bold text-[#5EEAD4]">
                    {analysis.yourSolution.timeComplexity || "O(?)"}
                  </div>
                </div>

                <div className="rounded-2xl bg-[#171B2E] border border-[#2A2F4A]/40 p-4 hover:border-[#5EEAD4]/30 transition-all shadow-md">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#8B93B0]">Space Complexity</span>
                  <div className="mt-1 font-mono text-xl font-bold text-[#5EEAD4]">
                    {analysis.yourSolution.spaceComplexity || "O(?)"}
                  </div>
                </div>
              </div>

              {/* Reasoning Card */}
              <div className="rounded-2xl bg-[#171B2E] border border-[#2A2F4A]/40 p-5 shadow-sm space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#8B93B0] flex items-center gap-1.5">
                  <Brain className="size-3.5 text-[#8B93B0]" />
                  Code Logic & Flow
                </h3>
                <p className="text-sm leading-relaxed text-[#EDEFF7]/90 whitespace-pre-line">
                  {analysis.yourSolution.reasoning}
                </p>
              </div>

              {/* Critiques & Feedback Card */}
              <div className="rounded-2xl bg-[#171B2E] border border-[#2A2F4A]/40 p-5 shadow-sm space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#8B93B0] flex items-center gap-1.5">
                  <Info className="size-3.5 text-[#8B93B0]" />
                  Optimization Potential
                </h3>
                <p className="text-sm leading-relaxed text-[#EDEFF7]/90 whitespace-pre-line">
                  {analysis.yourSolution.feedback}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Alternative Solutions */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 border-b border-[#2A2F4A]/30 pb-3">
            <Layers className="size-5 text-[#8B7CF6]" />
            <h2 className="font-space text-xl font-bold text-[#EDEFF7]">Alternative Approaches</h2>
          </div>

          {/* Desktop Grid Layout */}
          <div className="hidden grid-cols-1 gap-6 lg:grid lg:grid-cols-3">
            {analysis.alternatives.map((alt, idx) => (
              <div
                key={idx}
                className="flex flex-col rounded-2xl bg-[#171B2E] border border-[#2A2F4A]/40 p-5 hover:border-[#8B7CF6]/40 transition-colors shadow-md space-y-4"
              >
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-[#8B7CF6]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#8B7CF6]">
                    Approach {idx + 1}
                  </span>
                  <span className="font-mono text-xs font-semibold text-[#8B93B0]">
                    {alt.language}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-[#0E1220]/60 p-2.5 text-center">
                    <div className="text-[9px] font-bold uppercase tracking-wider text-[#8B93B0]">Time</div>
                    <div className="font-mono text-sm font-semibold text-[#8B7CF6]">{alt.timeComplexity}</div>
                  </div>
                  <div className="rounded-xl bg-[#0E1220]/60 p-2.5 text-center">
                    <div className="text-[9px] font-bold uppercase tracking-wider text-[#8B93B0]">Space</div>
                    <div className="font-mono text-sm font-semibold text-[#8B7CF6]">{alt.spaceComplexity}</div>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-[9px] font-bold uppercase tracking-wider text-[#8B93B0]">Key Concepts</div>
                  <div className="flex flex-wrap gap-1">
                    {[...(alt.dsaConcepts ?? []), ...(alt.conceptsUsed ?? [])].map((c, cIdx) => (
                      <span key={cIdx} className="rounded-md bg-[#2A2F4A]/40 px-2 py-0.5 text-[10px] text-[#EDEFF7]/80">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="space-y-1 flex-1">
                  <div className="text-[9px] font-bold uppercase tracking-wider text-[#8B93B0]">Overview</div>
                  <p className="text-xs leading-relaxed text-[#8B93B0] line-clamp-3 hover:line-clamp-none transition-all">
                    {alt.reasoning}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveAltIndex(activeAltIndex === idx ? null : idx)}
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#2A2F4A] py-2 text-xs font-medium text-[#EDEFF7] hover:bg-[#1F2440] transition-colors"
                >
                  <Code className="size-3.5" />
                  {activeAltIndex === idx ? "Hide Code Snippet" : "View Code Snippet"}
                </button>

                {activeAltIndex === idx && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="overflow-hidden"
                  >
                    <CodeBlock code={alt.code} language={alt.language} className="my-2" />
                  </motion.div>
                )}
              </div>
            ))}
          </div>

          {/* Mobile swipe and medium tablet screens */}
          <div className="flex w-full gap-4 overflow-x-auto pb-4 snap-x snap-mandatory lg:hidden">
            {analysis.alternatives.map((alt, idx) => (
              <div
                key={idx}
                className="flex w-[290px] shrink-0 snap-center flex-col rounded-2xl bg-[#171B2E] border border-[#2A2F4A]/40 p-5 shadow-md space-y-4"
              >
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-[#8B7CF6]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#8B7CF6]">
                    Approach {idx + 1}
                  </span>
                  <span className="font-mono text-xs font-semibold text-[#8B93B0]">
                    {alt.language}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-[#0E1220]/60 p-2 text-center">
                    <div className="text-[9px] font-bold uppercase tracking-wider text-[#8B93B0]">Time</div>
                    <div className="font-mono text-xs font-semibold text-[#8B7CF6]">{alt.timeComplexity}</div>
                  </div>
                  <div className="rounded-xl bg-[#0E1220]/60 p-2 text-center">
                    <div className="text-[9px] font-bold uppercase tracking-wider text-[#8B93B0]">Space</div>
                    <div className="font-mono text-xs font-semibold text-[#8B7CF6]">{alt.spaceComplexity}</div>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-[9px] font-bold uppercase tracking-wider text-[#8B93B0]">Concepts</div>
                  <div className="flex flex-wrap gap-1 max-h-[44px] overflow-y-auto">
                    {[...(alt.dsaConcepts ?? []), ...(alt.conceptsUsed ?? [])].map((c, cIdx) => (
                      <span key={cIdx} className="rounded-md bg-[#2A2F4A]/40 px-1.5 py-0.5 text-[9px] text-[#EDEFF7]/80">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="space-y-1 flex-1">
                  <div className="text-[9px] font-bold uppercase tracking-wider text-[#8B93B0]">Overview</div>
                  <p className="text-xs leading-relaxed text-[#8B93B0] line-clamp-3">
                    {alt.reasoning}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveAltIndex(activeAltIndex === idx ? null : idx)}
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#2A2F4A] py-2 text-xs font-medium text-[#EDEFF7]"
                >
                  <Code className="size-3.5" />
                  {activeAltIndex === idx ? "Hide Code" : "View Code"}
                </button>

                {activeAltIndex === idx && (
                  <div className="w-full overflow-hidden">
                    <CodeBlock code={alt.code} language={alt.language} className="my-2" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
