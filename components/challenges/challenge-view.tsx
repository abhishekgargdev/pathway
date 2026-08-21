"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Play, Send } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { TestResultsPanel } from "@/components/challenges/test-results";
import { MarkdownContent } from "@/components/content/markdown-content";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CHALLENGE_LANGUAGES,
  DEFAULT_STARTERS,
  languageMeta,
  type ChallengeLanguageId,
} from "@/lib/challenges/languages";
import type {
  ChallengeGetResponse,
  ChallengeSubmitResponse,
  ChallengeTestResult,
} from "@/lib/challenges/types";
import { cn } from "@/lib/utils";

const MonacoCodeEditor = dynamic(
  () =>
    import("@/components/challenges/monaco-editor").then(
      (m) => m.MonacoCodeEditor,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[220px] items-center justify-center bg-[#0A0D1A] text-sm text-[#8B93B0]">
        Loading editor…
      </div>
    ),
  },
);

async function fetchChallenge(
  challengeId: string,
): Promise<ChallengeGetResponse> {
  const res = await fetch(`/api/challenges/${challengeId}`);
  const data = (await res.json()) as ChallengeGetResponse & { error?: string };
  if (!res.ok) throw new Error(data.error ?? "Failed to load challenge");
  return data;
}

async function submitChallenge(
  challengeId: string,
  body: { language: string; code: string; preview?: boolean },
): Promise<ChallengeSubmitResponse> {
  const res = await fetch(`/api/challenges/${challengeId}/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error((data as { error?: string }).error ?? "Submit failed");
  }
  return data as ChallengeSubmitResponse;
}

function challengeTitle(prompt: string, fallback: string): string {
  const heading = prompt.match(/^#{1,3}\s+(.+)$/m);
  if (heading?.[1]) return heading[1].trim();
  const first = prompt.split("\n").find((l) => l.trim());
  if (first && first.length < 80) return first.trim();
  return fallback;
}

function difficultyTone(d: string | null) {
  if (d === "easy") return "text-[#5EEAD4] bg-[#5EEAD4]/20";
  if (d === "hard") return "text-[#FB7185] bg-[#FB7185]/20";
  return "text-[#FBBF24] bg-[#FBBF24]/20";
}

export function ChallengeView({ challengeId }: { challengeId: string }) {
  const queryClient = useQueryClient();
  const [language, setLanguage] = useState<ChallengeLanguageId>("python");
  const [code, setCode] = useState(DEFAULT_STARTERS.python);
  const [results, setResults] = useState<ChallengeTestResult[]>([]);
  const [allPassed, setAllPassed] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["challenge", challengeId],
    queryFn: () => fetchChallenge(challengeId),
  });

  useEffect(() => {
    if (!data?.latestSubmission) return;
    setResults(data.latestSubmission.testResults);
    setAllPassed(data.latestSubmission.allPassed);
    setHasSubmitted(true);
    const lang = data.latestSubmission.language as ChallengeLanguageId;
    if (CHALLENGE_LANGUAGES.some((l) => l.id === lang)) {
      setLanguage(lang);
    }
    if (data.latestSubmission.code?.trim()) {
      setCode(data.latestSubmission.code);
    }
  }, [data?.latestSubmission]);

  const runMutation = useMutation({
    mutationFn: () =>
      submitChallenge(challengeId, { language, code, preview: true }),
    onSuccess: (res) => {
      setResults(res.testResults);
      setAllPassed(false);
    },
  });

  const submitMutation = useMutation({
    mutationFn: () => submitChallenge(challengeId, { language, code }),
    onSuccess: async (res) => {
      setResults(res.testResults);
      setAllPassed(res.allPassed);
      setHasSubmitted(true);
      await queryClient.invalidateQueries({ queryKey: ["challenge", challengeId] });
    },
  });

  const busy = runMutation.isPending || submitMutation.isPending;
  const actionError =
    (runMutation.error instanceof Error && runMutation.error.message) ||
    (submitMutation.error instanceof Error && submitMutation.error.message) ||
    null;

  const meta = languageMeta(language);
  const challenge = data?.challenge;

  const title = useMemo(() => {
    if (!challenge) return "Challenge";
    return challengeTitle(
      challenge.prompt,
      challenge.topicTitle ?? challenge.skillName,
    );
  }, [challenge]);

  function onLanguageChange(next: ChallengeLanguageId) {
    setLanguage(next);
    setCode(DEFAULT_STARTERS[next]);
  }

  if (isLoading) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-5 py-6 md:px-6 lg:px-8">
        <Skeleton className="h-10 w-10 rounded-xl bg-[#1F2440]" />
        <Skeleton className="h-8 w-64 rounded-md bg-[#1F2440]" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-64 rounded-2xl bg-[#171B2E]" />
          <Skeleton className="h-64 rounded-2xl bg-[#171B2E]" />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <main className="mx-auto w-full max-w-3xl px-5 py-6">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="mb-4 inline-flex size-9 items-center justify-center rounded-[10px] border border-[#2A2F4A] bg-[#1F2440] text-[#EDEFF7]"
        >
          <ArrowLeft className="size-4" />
        </button>
        <div className="rounded-2xl border border-[#FB7185]/30 bg-[#FB7185]/10 p-4 text-sm text-[#FB7185]">
          {error instanceof Error ? error.message : "Couldn’t load challenge."}
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

  if (data.status === "ready_tomorrow" && !challenge?.prompt) {
    return (
      <main className="mx-auto w-full max-w-3xl px-5 py-6 md:px-6 lg:px-8">
        <Link
          href={`/skills/${challenge?.skillId ?? ""}`}
          className="mb-4 inline-flex size-9 items-center justify-center rounded-[10px] border border-[#2A2F4A] bg-[#1F2440] text-[#EDEFF7]"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div className="rounded-2xl border border-[#FBBF24]/25 bg-[#171B2E] p-5 shadow-[0_0_24px_rgba(251,191,36,0.08)]">
          <p className="font-heading text-lg font-semibold text-[#EDEFF7]">
            Ready in tomorrow’s batch
          </p>
          <p className="mt-2 text-sm text-[#8B93B0]">
            AI quota is used up for today. This challenge will generate in the
            next daily run.
          </p>
        </div>
      </main>
    );
  }

  if (!challenge) {
    return (
      <main className="mx-auto w-full max-w-3xl px-5 py-6">
        <p className="text-sm text-[#8B93B0]">
          {data.message ?? "Challenge is still generating…"}
        </p>
      </main>
    );
  }

  const backHref = `/skills/${challenge.skillId}`;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col overflow-x-hidden px-5 py-6 pb-28 md:px-6 md:pb-10 lg:px-8">
      <div className="mb-4 flex items-start gap-3">
        <Link
          href={backHref}
          className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-[10px] border border-[#2A2F4A] bg-[#1F2440] text-[#EDEFF7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5EEAD4]/40"
          aria-label="Back"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="font-heading text-[17px] font-bold break-words text-[#EDEFF7] md:text-xl">
            {title}
          </h1>
          {challenge.difficulty ? (
            <span
              className={cn(
                "mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-bold capitalize",
                difficultyTone(challenge.difficulty),
              )}
            >
              {challenge.difficulty}
            </span>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 lg:items-start lg:gap-5">
        {/* Problem + results */}
        <section className="flex min-w-0 flex-col gap-4">
          <article className="rounded-2xl border border-[#2A2F4A] bg-[#171B2E] p-4 shadow-[0_4px_16px_rgba(0,0,0,0.25)] md:p-5">
            <MarkdownContent content={challenge.prompt} />

            {challenge.visibleTestCases.length > 0 ? (
              <div className="mt-4 flex flex-col gap-2">
                <p className="text-[12px] font-semibold tracking-[0.4px] text-[#8B93B0] uppercase">
                  Examples
                </p>
                {challenge.visibleTestCases.slice(0, 3).map((ex, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-[#2A2F4A] bg-[#1F2440] p-3"
                  >
                    <p className="mb-1.5 text-[12px] text-[#8B93B0]">
                      Example {i + 1}
                    </p>
                    <code className="block font-mono text-[12px] leading-relaxed text-[#EDEFF7]">
                      <span className="text-[#8B93B0]">Input: </span>
                      {ex.input}
                      {"\n"}
                      <span className="text-[#8B93B0]">Output: </span>
                      {ex.expectedOutput}
                    </code>
                  </div>
                ))}
              </div>
            ) : null}

            {challenge.constraints.length > 0 ? (
              <div className="mt-4">
                <p className="mb-2 text-[12px] font-semibold tracking-[0.4px] text-[#8B93B0] uppercase">
                  Constraints
                </p>
                <ul className="list-disc space-y-1 pl-5 text-[13px] text-[#8B93B0]">
                  {challenge.constraints.map((c) => (
                    <li key={c} className="break-words">
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </article>

          {results.length > 0 ? (
            <div className="rounded-2xl border border-[#2A2F4A] bg-[#171B2E] p-4 shadow-[0_4px_16px_rgba(0,0,0,0.25)] md:p-5">
              <TestResultsPanel results={results} />
            </div>
          ) : null}

          {allPassed && hasSubmitted ? (
            <Link
              href={`/challenges/${challengeId}/analysis`}
              className="inline-flex h-12 min-h-12 items-center justify-center rounded-xl bg-[#5EEAD4] font-heading text-[15px] font-semibold text-[#0E1220] shadow-[0_0_28px_rgba(94,234,212,0.35)]"
            >
              View solution analysis
            </Link>
          ) : null}
        </section>

        {/* Editor */}
        <section className="flex min-w-0 flex-col gap-3">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {CHALLENGE_LANGUAGES.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => onLanguageChange(l.id)}
                className={cn(
                  "shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5EEAD4]/40",
                  language === l.id
                    ? "border-[#5EEAD4]/40 bg-[#5EEAD4]/15 text-[#5EEAD4]"
                    : "border-[#2A2F4A] bg-[#1F2440] text-[#8B93B0]",
                )}
              >
                {l.label}
              </button>
            ))}
          </div>

          <div className="overflow-hidden rounded-2xl border border-[#2A2F4A] shadow-[0_4px_16px_rgba(0,0,0,0.25)]">
            <div className="flex items-center justify-between border-b border-[#2A2F4A] bg-[#171B2E] px-4 py-2">
              <span className="font-mono text-[12px] text-[#8B93B0]">
                solution{meta.ext}
              </span>
              <div className="flex gap-1">
                {["#FB7185", "#FBBF24", "#5EEAD4"].map((c) => (
                  <span
                    key={c}
                    className="size-2 rounded-full opacity-50"
                    style={{ background: c }}
                  />
                ))}
              </div>
            </div>
            <MonacoCodeEditor
              language={meta.monaco}
              value={code}
              onChange={setCode}
              height={420}
              className="h-[min(52vh,420px)] lg:h-[420px]"
            />
          </div>

          {actionError ? (
            <p className="text-sm text-[#FB7185]">{actionError}</p>
          ) : null}

          <div className="flex gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => runMutation.mutate()}
              className="inline-flex h-11 min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-[#2A2F4A] bg-[#1F2440] text-sm font-medium text-[#EDEFF7] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5EEAD4]/40"
            >
              {runMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Play className="size-4" />
              )}
              {runMutation.isPending ? "Running…" : "Run"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => submitMutation.mutate()}
              className={cn(
                "inline-flex h-11 min-h-11 flex-1 items-center justify-center gap-2 rounded-xl text-sm font-semibold",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5EEAD4]/40",
                allPassed && hasSubmitted
                  ? "bg-[#5EEAD4] text-[#0E1220] shadow-[0_0_20px_rgba(94,234,212,0.3)]"
                  : "bg-[#5EEAD4] text-[#0E1220] shadow-[0_0_20px_rgba(94,234,212,0.25)]",
                "disabled:opacity-60",
              )}
            >
              {submitMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              {submitMutation.isPending
                ? "Judging…"
                : allPassed && hasSubmitted
                  ? "Accepted"
                  : "Submit"}
            </button>
          </div>
          <p className="text-[12px] text-[#8B93B0]">
            Run uses visible examples. Submit judges all{" "}
            {challenge.totalTestCount} tests (including hidden).
          </p>
        </section>
      </div>
    </div>
  );
}
