"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, CheckCircle, HelpCircle, BookOpen, AlertCircle } from "lucide-react";
import Link from "next/link";

import { CodeBlock } from "@/components/content/CodeBlock";
import { MarkdownContent } from "@/components/content/markdown-content";
import { Skeleton } from "@/components/ui/skeleton";
import type { SubtopicContentResponse } from "@/lib/subtopics/types";
import { cn } from "@/lib/utils";

async function fetchSubtopic(subtopicId: string): Promise<SubtopicContentResponse> {
  const res = await fetch(`/api/subtopics/${subtopicId}`);
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? "Failed to load subtopic");
  }
  return res.json() as Promise<SubtopicContentResponse>;
}

export function SubtopicContentView({ subtopicId }: { subtopicId: string }) {
  // Query lesson contents. If currently generating, poll every 4 seconds.
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["subtopic", subtopicId],
    queryFn: () => fetchSubtopic(subtopicId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "generating" ? 4000 : false;
    },
  });

  if (isLoading) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-5 py-6 md:px-6 md:py-8 lg:px-8">
        <Skeleton className="h-10 w-10 rounded-xl bg-[#1F2440]" />
        <Skeleton className="h-4 w-32 rounded bg-[#1F2440]" />
        <Skeleton className="h-8 w-64 rounded bg-[#1F2440]" />
        <Skeleton className="h-80 w-full rounded-2xl bg-[#171B2E]" />
      </main>
    );
  }

  const backHref = data ? `/skills/${data.skill.id}` : "/skills";

  if (isError || !data) {
    return (
      <main className="mx-auto w-full max-w-3xl px-5 py-8 md:px-6 md:py-12 lg:px-8">
        <Link
          href="/skills"
          className={cn(
            "mb-6 inline-flex size-10 items-center justify-center rounded-xl",
            "border border-[#2A2F4A] bg-[#1F2440] text-[#EDEFF7]",
            "transition-colors hover:border-[#5EEAD4]/30 hover:text-[#5EEAD4]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5EEAD4]/40",
          )}
          aria-label="Back to Skills"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div className="rounded-2xl border border-[#FB7185]/30 bg-[#FB7185]/5 p-6 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-[#FB7185]/10 text-[#FB7185]">
            <AlertCircle className="size-6" />
          </div>
          <h2 className="mt-4 font-heading text-lg font-bold text-[#EDEFF7]">
            Couldn’t load lesson content
          </h2>
          <p className="mt-2 text-sm text-[#8B93B0]">
            {error instanceof Error ? error.message : "An unexpected error occurred."}
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => void refetch()}
              className={cn(
                "inline-flex h-11 items-center justify-center rounded-xl bg-[#1F2440] px-5 text-sm font-semibold text-[#EDEFF7] border border-[#2A2F4A] hover:bg-[#1F2440]/80",
              )}
            >
              Try Again
            </button>
            <Link
              href="/skills"
              className={cn(
                "inline-flex h-11 items-center justify-center rounded-xl bg-[#5EEAD4] px-5 text-sm font-semibold text-[#0E1220] hover:bg-[#5EEAD4]/90",
              )}
            >
              Back to My Skills
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // Quota Exceeded Batch State
  if (data.status === "ready_tomorrow" && !data.content) {
    return (
      <main className="mx-auto w-full max-w-3xl px-5 py-6 md:px-6 md:py-8 lg:px-8 text-[#EDEFF7]">
        <Link
          href={backHref}
          className={cn(
            "mb-5 inline-flex size-10 items-center justify-center rounded-xl",
            "border border-[#2A2F4A] bg-[#1F2440] text-[#EDEFF7] transition-colors hover:border-[#5EEAD4]/30 hover:text-[#5EEAD4]",
          )}
          aria-label="Back to Learning Path"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div className="rounded-2xl border border-[#FBBF24]/30 bg-[#171B2E] p-6 shadow-[0_8px_32px_rgba(0,0,0,0.35)]">
          <div className="flex size-12 items-center justify-center rounded-xl bg-[#FBBF24]/10 text-[#FBBF24]">
            <BookOpen className="size-6" />
          </div>
          <h2 className="mt-4 font-heading text-lg font-bold text-[#EDEFF7]">
            This lesson is queued and will be available when generation capacity resets
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[#8B93B0]">
            Pathway&apos;s AI key rotation quota has been temporarily reached for today. The outline remains ready, and content is queued to generate in the next daily batch. Check back tomorrow!
          </p>
          <div className="mt-6">
            <Link
              href={backHref}
              className={cn(
                "inline-flex h-10 items-center justify-center rounded-xl bg-[#5EEAD4] px-5 text-xs font-bold text-[#0E1220] hover:bg-[#5EEAD4]/90",
              )}
            >
              Back to Learning Path
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const isCompleted = data.progressStatus === "completed";

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-6 md:px-6 md:py-8 lg:px-8 text-[#EDEFF7] pb-24">
      {/* Header bar */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#2A2F4A] pb-5">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.5px] text-[#8B93B0]">
            {data.skill.name} · {data.topic.title}
          </p>
          <h1 className="mt-1 font-heading text-xl font-bold tracking-tight text-[#EDEFF7] md:text-2xl break-words">
            {data.subtopic.title}
          </h1>
        </div>

        {/* Progress badge / Action button */}
        <div className="flex items-center gap-3 shrink-0">
          {isCompleted ? (
            <div className="inline-flex items-center gap-1.5 rounded-full border border-[#5EEAD4]/30 bg-[#5EEAD4]/10 px-3 py-1 text-xs font-bold text-[#5EEAD4]">
              <CheckCircle className="size-3.5" />
              Completed
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 rounded-full border border-[#5EEAD4]/10 bg-[#5EEAD4]/5 px-3 py-1 text-xs font-bold text-[#5EEAD4] animate-pulse">
              <span className="size-1.5 rounded-full bg-[#5EEAD4]" />
              In Progress
            </div>
          )}

          {isFetching && (
            <Loader2 className="size-4 shrink-0 animate-spin text-[#8B93B0]" />
          )}
        </div>
      </div>

      {/* Lesson Content Body */}
      {!data.content ? (
        <div className="rounded-2xl border border-[#2A2F4A] bg-[#171B2E] p-6 shadow-[0_4px_16px_rgba(0,0,0,0.25)] text-center py-16">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-[#5EEAD4]/10 text-[#5EEAD4] animate-spin mb-4">
            <Loader2 className="size-6" />
          </div>
          <h3 className="font-heading text-base font-bold text-[#EDEFF7]">
            Generating lesson content...
          </h3>
          <p className="mt-2 text-xs text-[#8B93B0] max-w-sm mx-auto">
            {data.message ?? "This usually takes about 10-20 seconds. Please hold on."}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Main article content */}
          <article className="rounded-2xl border border-[#2A2F4A] bg-[#171B2E] p-5 shadow-[0_4px_16px_rgba(0,0,0,0.25)] md:p-6">
            <MarkdownContent content={data.content.body} />

            {/* Simplified version cached block */}
            {data.content.simplifiedExplanation && (
              <div className="mt-8 rounded-xl border border-[#FBBF24]/30 bg-[#FBBF24]/5 p-5">
                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.5px] text-[#FBBF24] mb-3">
                  <HelpCircle className="size-3.5" />
                  Simplified Explanation
                </div>
                <MarkdownContent content={data.content.simplifiedExplanation} />
              </div>
            )}
          </article>

          {/* Examples list header */}
          {data.content.examples.length > 0 && (
            <div className="space-y-4">
              <h2 className="font-heading text-base font-bold text-[#EDEFF7] px-1">
                Learning Examples
              </h2>
              <div className="grid grid-cols-1 gap-4">
                {data.content.examples.map((example, index) => (
                  <div
                    key={index}
                    className="rounded-xl border border-[#2A2F4A] bg-[#171B2E] p-5 shadow-[0_4px_16px_rgba(0,0,0,0.2)]"
                  >
                    {example.title && (
                      <h3 className="font-heading text-sm font-bold text-[#EDEFF7] mb-2">
                        Example {index + 1}: {example.title}
                      </h3>
                    )}
                    {example.explanation && (
                      <p className="text-xs leading-relaxed text-[#8B93B0] mb-4">
                        {example.explanation}
                      </p>
                    )}
                    {example.code && (
                      <CodeBlock
                        code={example.code}
                        language={example.language || "code"}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quiz Call to Action block */}
          <div className="rounded-2xl border border-[#5EEAD4]/20 bg-[#5EEAD4]/5 p-6 text-center shadow-[0_4px_24px_rgba(94,234,212,0.06)]">
            <h3 className="font-heading text-base font-bold text-[#EDEFF7]">
              Check your understanding
            </h3>
            <p className="mt-2 text-xs text-[#8B93B0] max-w-sm mx-auto leading-relaxed">
              Take the quick practice quiz to review what you&apos;ve learned. Passing with 70% or higher marks this subtopic as complete!
            </p>
            <div className="mt-5">
              <Link
                href={`/subtopics/${subtopicId}/quiz`}
                className={cn(
                  "inline-flex h-11 items-center justify-center rounded-xl bg-[#5EEAD4] px-6 text-sm font-bold text-[#0E1220] transition-all",
                  "shadow-[0_0_20px_rgba(94,234,212,0.25)] hover:bg-[#5EEAD4]/90 hover:shadow-[0_0_28px_rgba(94,234,212,0.4)]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5EEAD4]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#171B2E]",
                )}
              >
                Start Practice Quiz
              </Link>
            </div>
          </div>

          {/* Sibling Lesson Navigation links */}
          <div className="flex items-center justify-between border-t border-[#2A2F4A] pt-6 mt-8">
            {data.navigation?.prevSubtopicId ? (
              <Link
                href={`/subtopics/${data.navigation.prevSubtopicId}`}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#8B93B0] hover:text-[#5EEAD4] transition-colors"
                aria-label={`Go to previous lesson: ${data.navigation.prevSubtopicTitle}`}
              >
                ← Previous
              </Link>
            ) : (
              <span className="text-xs text-[#2A2F4A] cursor-not-allowed">Start of Path</span>
            )}

            <Link
              href={backHref}
              className="text-xs font-bold uppercase tracking-[0.5px] text-[#5EEAD4] hover:underline"
            >
              Learning Path
            </Link>

            {data.navigation?.nextSubtopicId ? (
              <Link
                href={`/subtopics/${data.navigation.nextSubtopicId}`}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#8B93B0] hover:text-[#5EEAD4] transition-colors"
                aria-label={`Go to next lesson: ${data.navigation.nextSubtopicTitle}`}
              >
                Next →
              </Link>
            ) : (
              <span className="text-xs text-[#2A2F4A] cursor-not-allowed">End of Path</span>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
