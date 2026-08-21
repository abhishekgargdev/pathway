"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Play, Send, RotateCcw, Check, X, HelpCircle } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { MarkdownContent } from "@/components/content/markdown-content";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getSupportedLanguages,
  getLanguageConfig,
  runAgainstTestCasesBrowser,
} from "@/lib/code-runner";
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

  // Load languages registry
  const supportedLanguages = useMemo(() => getSupportedLanguages(), []);
  const [language, setLanguage] = useState<string>(() => {
    return supportedLanguages[0]?.id ?? "python";
  });

  const activeLangConfig = useMemo(() => {
    return getLanguageConfig(language);
  }, [language]);

  const [code, setCode] = useState("");
  const [results, setResults] = useState<ChallengeTestResult[]>([]);
  const [allPassed, setAllPassed] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [activeTab, setActiveTab] = useState<"results" | "history">("results");
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [runLoading, setRunLoading] = useState(false);

  // Fetch challenge details
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["challenge", challengeId],
    queryFn: () => fetchChallenge(challengeId),
  });

  // Restore saved code from localStorage or load starter code
  useEffect(() => {
    if (!challengeId || !language) return;
    const key = `pathway:challenge:${challengeId}:${language}`;
    const saved = localStorage.getItem(key);
    
    // Defer state setter calls to prevent cascading render warnings
    const timer = setTimeout(() => {
      if (saved !== null) {
        setCode(saved);
      } else if (data?.latestSubmission && data.latestSubmission.language === language) {
        setCode(data.latestSubmission.code);
      } else {
        setCode(activeLangConfig?.starterCode ?? "");
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [challengeId, language, data?.latestSubmission, activeLangConfig]);

  // Debounced Autosave to localStorage
  useEffect(() => {
    if (!challengeId || !language || !code) return;
    const key = `pathway:challenge:${challengeId}:${language}`;
    const timer = setTimeout(() => {
      localStorage.setItem(key, code);
    }, 1000);
    return () => clearTimeout(timer);
  }, [challengeId, language, code]);

  // Handle incoming submission state on first load
  useEffect(() => {
    if (!data?.latestSubmission) return;
    const latest = data.latestSubmission;
    
    // Defer state setter calls to prevent cascading render warnings
    const timer = setTimeout(() => {
      setResults(latest.testResults);
      setAllPassed(latest.allPassed);
      setHasSubmitted(true);
      const lang = latest.language;
      if (supportedLanguages.some((l) => l.id === lang)) {
        setLanguage(lang);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [data?.latestSubmission, supportedLanguages]);

  // Local Client Sandbox Run Code Mutation (Uses browser Web Workers / Pyodide)
  const handleRunCode = async () => {
    if (!data?.challenge) return;
    setRunLoading(true);
    setActiveTab("results");

    try {
      const visibleCases = data.challenge.visibleTestCases.map((tc) => ({
        input: tc.input,
        expectedOutput: tc.expectedOutput,
      }));

      const summary = await runAgainstTestCasesBrowser(code, language, visibleCases);

      const mappedResults: ChallengeTestResult[] = summary.results.map((r) => ({
        input: r.input,
        expected: r.expected,
        actual: r.actual,
        passed: r.passed,
      }));

      setResults(mappedResults);
      setAllPassed(false);
    } catch (err) {
      console.error("Local execution run failed", err);
    } finally {
      setRunLoading(false);
    }
  };

  // Submit Challenge Mutation (Judges hidden test cases on Server side)
  const submitMutation = useMutation({
    mutationFn: () => submitChallenge(challengeId, { language, code }),
    onSuccess: async (res) => {
      setResults(res.testResults);
      setAllPassed(res.allPassed);
      setHasSubmitted(true);
      setActiveTab("results");
      await queryClient.invalidateQueries({ queryKey: ["challenge", challengeId] });
    },
  });

  const busy = runLoading || submitMutation.isPending;
  const actionError = submitMutation.error instanceof Error ? submitMutation.error.message : null;
  const challenge = data?.challenge;

  const title = useMemo(() => {
    if (!challenge) return "Challenge";
    return challengeTitle(
      challenge.prompt,
      challenge.topicTitle ?? challenge.skillName,
    );
  }, [challenge]);

  function onLanguageChange(next: string) {
    setLanguage(next);
  }

  function handleResetConfirm() {
    setCode(activeLangConfig?.starterCode ?? "");
    setShowResetConfirm(false);
  }

  if (isLoading) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-5 py-6 md:px-6 lg:px-8">
        <Skeleton className="h-10 w-10 rounded-xl bg-[#1F2440]" />
        <Skeleton className="h-8 w-64 rounded-md bg-[#1F2440]" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-96 rounded-2xl bg-[#171B2E]" />
          <Skeleton className="h-96 rounded-2xl bg-[#171B2E]" />
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
  const passedCount = results.filter((r) => r.passed).length;
  const isSubmissionAccepted = allPassed && hasSubmitted;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col overflow-x-hidden px-5 py-6 pb-28 md:px-6 md:pb-10 lg:px-8">
      
      {/* Title block */}
      <div className="mb-4 flex items-start gap-3">
        <Link
          href={backHref}
          className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-[10px] border border-[#2A2F4A] bg-[#1F2440] text-[#EDEFF7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5EEAD4]/40"
          aria-label="Back to Learning Path"
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

      <div className="grid gap-5 lg:grid-cols-2 lg:items-start lg:gap-6">
        {/* Left side: Problem statement */}
        <section className="flex min-w-0 flex-col gap-4">
          <article className="rounded-2xl border border-[#2A2F4A] bg-[#171B2E] p-4 shadow-[0_4px_16px_rgba(0,0,0,0.25)] md:p-5">
            <MarkdownContent content={challenge.prompt} />

            {challenge.visibleTestCases.length > 0 ? (
              <div className="mt-5 flex flex-col gap-2">
                <p className="text-[12px] font-semibold tracking-[0.4px] text-[#8B93B0] uppercase">
                  Examples
                </p>
                {challenge.visibleTestCases.slice(0, 3).map((ex, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-[#2A2F4A] bg-[#1F2440] p-3"
                  >
                    <p className="mb-1 text-[12px] text-[#8B93B0] font-medium">
                      Example {i + 1}
                    </p>
                    <code className="block font-mono text-[12px] leading-relaxed text-[#EDEFF7] whitespace-pre-wrap">
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
              <div className="mt-5">
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

          {/* Solution analysis CTA */}
          {isSubmissionAccepted ? (
            <Link
              href={`/challenges/${challengeId}/analysis`}
              className="inline-flex h-12 min-h-12 items-center justify-center rounded-xl bg-[#5EEAD4] font-heading text-[15px] font-semibold text-[#0E1220] shadow-[0_0_28px_rgba(94,234,212,0.35)] transition-transform hover:scale-[1.01]"
            >
              View Solution Analysis
            </Link>
          ) : null}
        </section>

        {/* Right side: Editor & Controls */}
        <section className="flex min-w-0 flex-col gap-4">
          
          {/* Language selector chips */}
          <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Languages">
            {supportedLanguages.map((l) => (
              <button
                key={l.id}
                type="button"
                role="tab"
                aria-selected={language === l.id}
                onClick={() => onLanguageChange(l.id)}
                className={cn(
                  "shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5EEAD4]/40",
                  language === l.id
                    ? "border-[#5EEAD4]/40 bg-[#5EEAD4]/15 text-[#5EEAD4] font-semibold"
                    : "border-[#2A2F4A] bg-[#1F2440] text-[#8B93B0] hover:text-[#EDEFF7]",
                )}
              >
                {l.displayName}
              </button>
            ))}
          </div>

          {/* Monaco Editor panel */}
          <div className="overflow-hidden rounded-2xl border border-[#2A2F4A] shadow-[0_4px_16px_rgba(0,0,0,0.25)]">
            <div className="flex items-center justify-between border-b border-[#2A2F4A] bg-[#171B2E] px-4 py-2.5">
              <span className="font-mono text-[12px] text-[#8B93B0]">
                solution{activeLangConfig?.monacoLanguage === "python" ? ".py" : activeLangConfig?.monacoLanguage === "typescript" ? ".ts" : ".js"}
              </span>
              <button
                type="button"
                onClick={() => setShowResetConfirm(true)}
                className="flex items-center gap-1.5 rounded-lg border border-[#2A2F4A] bg-[#1F2440] px-2.5 py-1 text-[11px] font-medium text-[#8B93B0] hover:text-[#EDEFF7] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#5EEAD4]"
              >
                <RotateCcw className="size-3" />
                Reset
              </button>
            </div>
            <MonacoCodeEditor
              language={activeLangConfig?.monacoLanguage ?? "python"}
              value={code}
              onChange={setCode}
              height={420}
              className="h-[min(52vh,420px)] lg:h-[420px]"
            />
          </div>

          {actionError ? (
            <p className="text-sm text-[#FB7185]" role="alert">{actionError}</p>
          ) : null}

          {/* Execution triggers */}
          <div className="flex gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={handleRunCode}
              className="inline-flex h-11 min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-[#2A2F4A] bg-[#1F2440] text-sm font-medium text-[#EDEFF7] hover:bg-[#252A4A] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5EEAD4]/40"
            >
              {runLoading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Play className="size-4" />
              )}
              {runLoading ? "Running…" : "Run"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => submitMutation.mutate()}
              className={cn(
                "inline-flex h-11 min-h-11 flex-1 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5EEAD4]/40",
                "bg-[#5EEAD4] text-[#0E1220] hover:bg-[#4dd2bd] disabled:opacity-60",
                isSubmissionAccepted && "shadow-[0_0_20px_rgba(94,234,212,0.35)]",
              )}
            >
              {submitMutation.isPending ? (
                <Loader2 className="size-4 animate-spin text-[#0E1220]" />
              ) : (
                <Send className="size-4" />
              )}
              {submitMutation.isPending
                ? "Judging…"
                : isSubmissionAccepted
                  ? "Accepted"
                  : "Submit"}
            </button>
          </div>

          <p className="text-[11px] text-[#8B93B0] leading-relaxed">
            Run operates on local browser worker threads. Submit executes all tests including hidden validation parameters.
          </p>

          {/* Output Results / Submission History tab panel */}
          <div className="rounded-2xl border border-[#2A2F4A] bg-[#171B2E] overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.25)]">
            <div className="flex border-b border-[#2A2F4A] bg-[#171B2E]" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "results"}
                onClick={() => setActiveTab("results")}
                className={cn(
                  "px-5 py-3 text-xs font-semibold uppercase tracking-[0.4px] border-b-2 transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#5EEAD4]/40",
                  activeTab === "results"
                    ? "border-[#5EEAD4] text-[#5EEAD4]"
                    : "border-transparent text-[#8B93B0] hover:text-[#EDEFF7]"
                )}
              >
                Test Results
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "history"}
                onClick={() => setActiveTab("history")}
                className={cn(
                  "px-5 py-3 text-xs font-semibold uppercase tracking-[0.4px] border-b-2 transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#5EEAD4]/40",
                  activeTab === "history"
                    ? "border-[#5EEAD4] text-[#5EEAD4]"
                    : "border-transparent text-[#8B93B0] hover:text-[#EDEFF7]"
                )}
              >
                Submission History
              </button>
            </div>

            <div className="p-4 md:p-5">
              {activeTab === "results" ? (
                results.length > 0 ? (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#8B93B0] font-mono">
                        {passedCount}/{results.length} cases passed
                      </span>
                    </div>
                    <div className="flex max-h-[300px] flex-col gap-2.5 overflow-y-auto pr-1">
                      {results.map((t, i) => (
                        <div
                          key={i}
                          className={cn(
                            "flex items-start gap-3 rounded-xl border p-3.5 transition-opacity duration-200",
                            t.passed
                              ? "border-[#5EEAD4]/20 bg-[#5EEAD4]/5"
                              : "border-[#FB7185]/20 bg-[#FB7185]/5",
                          )}
                        >
                          <div
                            className={cn(
                              "mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded-full",
                              t.passed ? "bg-[#5EEAD4]" : "bg-[#FB7185]",
                            )}
                          >
                            {t.passed ? (
                              <Check className="size-2.5 text-[#0E1220]" strokeWidth={3.5} />
                            ) : (
                              <X className="size-2.5 text-[#0E1220]" strokeWidth={3.5} />
                            )}
                          </div>
                          <code className="min-w-0 flex-1 break-words font-mono text-[12px] leading-relaxed text-[#8B93B0] whitespace-pre-wrap">
                            <span className="text-[#8B93B0]">Input: </span>
                            <span className="text-[#EDEFF7]">{t.input === "(hidden)" ? "[Hidden Parameters]" : t.input}</span>
                            {"\n"}
                            <span className="text-[#8B93B0]">Expected: </span>
                            <span className="text-[#EDEFF7]">{t.expected === "(hidden)" ? "[Hidden expected]" : t.expected}</span>
                            {"\n"}
                            <span className="text-[#8B93B0]">Got: </span>
                            <span className={t.passed ? "text-[#5EEAD4]" : "text-[#FB7185]"}>
                              {t.actual === "(hidden)" ? "[Hidden actual]" : t.actual}
                            </span>
                          </code>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <HelpCircle className="size-7 text-[#8B93B0]/40 mb-2" />
                    <p className="text-sm text-[#8B93B0]">No run execution results yet.</p>
                  </div>
                )
              ) : (
                <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
                  {data.recentSubmissions && data.recentSubmissions.length > 0 ? (
                    data.recentSubmissions.map((sub) => (
                      <div
                        key={sub.id}
                        className="flex items-center justify-between rounded-xl border border-[#2A2F4A] bg-[#1F2440] p-3 text-xs"
                      >
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                "rounded px-1.5 py-0.5 font-bold uppercase text-[9px]",
                                sub.allPassed
                                  ? "bg-[#5EEAD4]/20 text-[#5EEAD4]"
                                  : "bg-[#FB7185]/20 text-[#FB7185]"
                              )}
                            >
                              {sub.allPassed ? "Accepted" : "Rejected"}
                            </span>
                            <span className="font-mono text-[#EDEFF7] capitalize">{sub.language}</span>
                          </div>
                          <span className="text-[#8B93B0]">
                            {new Date(sub.submittedAt).toLocaleDateString()} at{" "}
                            {new Date(sub.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-bold text-[#EDEFF7]">{sub.score}%</span>
                          <p className="text-[10px] text-[#8B93B0]">Passed</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <HelpCircle className="size-7 text-[#8B93B0]/40 mb-2" />
                      <p className="text-sm text-[#8B93B0]">No submissions logged.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Reset Confirmation Overlay Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0E1220]/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#2A2F4A] bg-[#171B2E] p-6 shadow-2xl">
            <h3 className="font-heading text-lg font-bold text-[#EDEFF7]">Reset Code?</h3>
            <p className="mt-2 text-sm text-[#8B93B0] leading-relaxed">
              This will overwrite your current solution with the default language starter code. This action is irreversible.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="h-10 rounded-xl bg-[#1F2440] px-4.5 text-xs font-medium text-[#EDEFF7] hover:bg-[#2A3155] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#5EEAD4]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetConfirm}
                className="h-10 rounded-xl bg-[#FB7185] px-4.5 text-xs font-semibold text-[#0E1220] hover:bg-[#FB7185]/90 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#FB7185]"
              >
                Confirm Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
