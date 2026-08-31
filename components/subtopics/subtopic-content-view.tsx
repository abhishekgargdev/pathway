"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { MarkdownContent } from "@/components/content/markdown-content";
import { Skeleton } from "@/components/ui/skeleton";
import type { SubtopicContentResponse } from "@/lib/subtopics/types";
import { cn } from "@/lib/utils";

async function fetchSubtopic(
  subtopicId: string,
): Promise<SubtopicContentResponse> {
  const res = await fetch(`/api/subtopics/${subtopicId}`);
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? "Failed to load subtopic");
  }
  return res.json() as Promise<SubtopicContentResponse>;
}

export function SubtopicContentView({ subtopicId }: { subtopicId: string }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showQuizBar, setShowQuizBar] = useState(false);

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["subtopic", subtopicId],
    queryFn: () => fetchSubtopic(subtopicId),
  });

  const [generatingIllustration, setGeneratingIllustration] = useState(false);
  const [illustrationError, setIllustrationError] = useState<string | null>(null);

  async function handleGenerateIllustration() {
    setGeneratingIllustration(true);
    setIllustrationError(null);
    try {
      const res = await fetch("/api/images/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subtopicId }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error ?? "Failed to generate concept illustration");
      }
      await refetch();
    } catch (err) {
      setIllustrationError(err instanceof Error ? err.message : "Failed to generate illustration");
    } finally {
      setGeneratingIllustration(false);
    }
  }

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !data?.content) return;
    // Show bar if content is short enough that user is already near bottom
    const nearBottom = el.scrollHeight - el.clientHeight < 120;
    if (nearBottom) setShowQuizBar(true);
  }, [data?.content]);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    setShowQuizBar(nearBottom);
  }

  if (isLoading) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-5 py-6 md:px-6 md:py-8 lg:px-8">
        <Skeleton className="h-10 w-10 rounded-xl bg-[#1F2440]" />
        <Skeleton className="h-7 w-56 rounded-md bg-[#1F2440]" />
        <Skeleton className="h-64 w-full rounded-2xl bg-[#171B2E]" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <main className="mx-auto w-full max-w-3xl px-5 py-6 md:px-6 md:py-8 lg:px-8">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="mb-4 inline-flex size-9 items-center justify-center rounded-[10px] border border-[#2A2F4A] bg-[#1F2440] text-[#EDEFF7]"
          aria-label="Back"
        >
          <ArrowLeft className="size-4" />
        </button>
        <div className="rounded-2xl border border-[#FB7185]/30 bg-[#FB7185]/10 p-4 text-sm text-[#FB7185]">
          {error instanceof Error ? error.message : "Couldn’t load lesson."}
          <button
            type="button"
            onClick={() => void refetch()}
            className="mt-3 block h-11 rounded-xl bg-[#171B2E] px-4 text-[#EDEFF7]"
          >
            Try again
          </button>
        </div>
      </main>
    );
  }

  const backHref = `/skills/${data.skill.id}`;

  if (data.status === "ready_tomorrow" && !data.content) {
    return (
      <main className="mx-auto w-full max-w-3xl px-5 py-6 md:px-6 md:py-8 lg:px-8">
        <Link
          href={backHref}
          className="mb-4 inline-flex size-9 items-center justify-center rounded-[10px] border border-[#2A2F4A] bg-[#1F2440] text-[#EDEFF7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5EEAD4]/40"
          aria-label="Back"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div className="rounded-2xl border border-[#FBBF24]/25 bg-[#171B2E] p-5 shadow-[0_0_24px_rgba(251,191,36,0.08)]">
          <p className="font-heading text-lg font-semibold text-[#EDEFF7]">
            Ready in tomorrow’s batch
          </p>
          <p className="mt-2 text-sm leading-relaxed text-[#8B93B0]">
            AI quota is used up for today. This lesson will generate in the next
            daily run — check back tomorrow.
          </p>
        </div>
      </main>
    );
  }

  return (
    <div className="relative flex min-h-full flex-col bg-[#0E1220]">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="mx-auto w-full max-w-3xl flex-1 overflow-x-hidden overflow-y-auto px-5 pt-6 pb-28 md:px-6 md:pt-8 md:pb-32 lg:px-8"
      >
        <div className="mb-5 flex items-center gap-3">
          <Link
            href={backHref}
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-[10px] border border-[#2A2F4A] bg-[#1F2440] text-[#EDEFF7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5EEAD4]/40"
            aria-label="Back to path"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div className="min-w-0">
            <p className="truncate text-[11px] font-semibold tracking-[0.5px] text-[#5EEAD4] uppercase">
              {data.topic.title}
            </p>
            <h1 className="font-heading text-lg font-bold break-words text-[#EDEFF7] md:text-xl">
              {data.subtopic.title}
            </h1>
          </div>
          {isFetching ? (
            <Loader2 className="ml-auto size-4 shrink-0 animate-spin text-[#8B93B0]" />
          ) : null}
        </div>

        {!data.content ? (
          <div className="rounded-2xl border border-[#2A2F4A] bg-[#171B2E] p-5">
            <p className="text-sm text-[#EDEFF7]">Generating lesson…</p>
            <p className="mt-1 text-[13px] text-[#8B93B0]">
              {data.message ?? "This usually takes a moment."}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {/* Concept Illustration Section */}
            <div className="overflow-hidden rounded-2xl border border-[#2A2F4A] bg-[#171B2E] p-4 shadow-[0_4px_16px_rgba(0,0,0,0.25)] md:p-5">
              <h2 className="font-heading text-xs font-bold tracking-[0.5px] text-[#8B93B0] uppercase mb-3">
                Concept Illustration
              </h2>
              {data.content.illustrationUrl ? (
                <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-[#2A2F4A] bg-[#0A0D1A]">
                  <img
                    src={data.content.illustrationUrl}
                    alt={`Illustration for ${data.subtopic.title}`}
                    className="h-full w-full object-cover object-center transition-all duration-300 hover:scale-[1.01]"
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#2A2F4A] bg-[#1F2440]/20 py-8 px-4 text-center">
                  <p className="text-sm text-[#8B93B0] mb-4">
                    Visualize this concept with a dynamically generated AI illustration.
                  </p>
                  <button
                    type="button"
                    disabled={generatingIllustration}
                    onClick={handleGenerateIllustration}
                    className="inline-flex h-10 items-center justify-center rounded-xl bg-[#5EEAD4] px-5 text-sm font-semibold text-[#0E1220] shadow-[0_0_20px_rgba(94,234,212,0.25)] transition-all hover:scale-[1.01] hover:shadow-[0_0_28px_rgba(94,234,212,0.4)] disabled:opacity-60 disabled:scale-100 disabled:pointer-events-none cursor-pointer"
                  >
                    {generatingIllustration ? (
                      <>
                        <Loader2 className="mr-2 size-4 animate-spin" />
                        Generating illustration...
                      </>
                    ) : (
                      "Generate Concept Illustration"
                    )}
                  </button>
                  {illustrationError && (
                    <p className="mt-3 text-xs text-[#FB7185]">{illustrationError}</p>
                  )}
                </div>
              )}
            </div>

            <article className="rounded-2xl border border-[#2A2F4A] bg-[#171B2E] p-4 shadow-[0_4px_16px_rgba(0,0,0,0.25)] md:p-5">
              <MarkdownContent content={data.content.body} />

              {data.content.examples.map((example, index) => (
                <div key={`${example.title}-${index}`} className="mt-5">
                  {example.title ? (
                    <h3 className="mb-2 font-heading text-base font-semibold text-[#EDEFF7]">
                      {example.title}
                    </h3>
                  ) : null}
                  {example.explanation ? (
                    <p className="mb-3 text-[14px] leading-relaxed text-[#8B93B0]">
                      {example.explanation}
                    </p>
                  ) : null}
                  {example.code ? (
                    <pre className="overflow-x-auto rounded-xl border border-[#2A2F4A] bg-[#1F2440] p-4 font-mono text-[12px] leading-relaxed text-[#EDEFF7]">
                      <code>{example.code}</code>
                    </pre>
                  ) : null}
                </div>
              ))}

              {data.content.simplifiedExplanation ? (
                <div className="mt-6 rounded-xl border border-[#FBBF24]/25 bg-[#FBBF24]/5 p-4">
                  <p className="mb-2 text-[11px] font-semibold tracking-[0.5px] text-[#FBBF24] uppercase">
                    Simpler explanation
                  </p>
                  <MarkdownContent content={data.content.simplifiedExplanation} />
                </div>
              ) : null}
            </article>
          </div>
        )}
      </div>

      <div
        className={cn(
          "pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-5 pb-[calc(4.75rem+env(safe-area-inset-bottom))] transition-all duration-250 md:px-6 md:pb-6 lg:px-8",
          showQuizBar && data.content
            ? "translate-y-0 opacity-100"
            : "translate-y-4 opacity-0",
        )}
      >
        <Link
          href={`/subtopics/${subtopicId}/quiz`}
          className={cn(
            "pointer-events-auto inline-flex h-12 min-h-12 w-full max-w-3xl items-center justify-center rounded-xl",
            "bg-[#5EEAD4] font-heading text-[15px] font-semibold text-[#0E1220]",
            "shadow-[0_0_28px_rgba(94,234,212,0.35)]",
            "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#5EEAD4]/40",
            !(showQuizBar && data.content) && "pointer-events-none",
          )}
        >
          Take the quiz
        </Link>
      </div>
    </div>
  );
}
