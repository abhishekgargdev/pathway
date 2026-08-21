"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, Check, Loader2, X, AlertTriangle, Play, HelpCircle, BookOpen } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { MarkdownContent } from "@/components/content/markdown-content";
import { Skeleton } from "@/components/ui/skeleton";
import type { QuizSubmitResponse } from "@/lib/subtopics/types";
import { cn } from "@/lib/utils";

type QuizQuestionClient = {
  id: string;
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string | null;
};

type QuizGetResponse = {
  status: "ready" | "ready_tomorrow" | "error";
  message?: string;
  error?: string;
  skillId?: string;
  questions: QuizQuestionClient[];
  simplifiedExplanation?: string | null;
};

async function fetchQuiz(subtopicId: string): Promise<QuizGetResponse> {
  const res = await fetch(`/api/subtopics/${subtopicId}/quiz`);
  const data = (await res.json()) as QuizGetResponse;
  if (!res.ok && data.status !== "ready_tomorrow") {
    throw new Error(data.error ?? "Failed to load quiz");
  }
  return data;
}

async function submitQuiz(
  subtopicId: string,
  answers: number[],
): Promise<QuizSubmitResponse> {
  const res = await fetch(`/api/subtopics/${subtopicId}/quiz`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ answers }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error((data as { error?: string }).error ?? "Submit failed");
  }
  return data as QuizSubmitResponse;
}

export function QuizView({
  subtopicId,
  skillId: skillIdProp,
}: {
  subtopicId: string;
  skillId?: string;
}) {
  const queryClient = useQueryClient();
  const reduceMotion = useReducedMotion();
  const [qi, setQi] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false); // Locked state after picking
  const [phase, setPhase] = useState<"quiz" | "result">("quiz");
  const [result, setResult] = useState<QuizSubmitResponse | null>(null);
  const [showSimple, setShowSimple] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["quiz", subtopicId],
    queryFn: () => fetchQuiz(subtopicId),
  });

  const mutation = useMutation({
    mutationFn: (vals: number[]) => submitQuiz(subtopicId, vals),
    onSuccess: async (res) => {
      setResult(res);
      setPhase("result");
      if (res.simplifiedExplanation) setShowSimple(true);
      await queryClient.invalidateQueries({ queryKey: ["subtopic", subtopicId] });
      await queryClient.invalidateQueries({ queryKey: ["skill-tree"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const questions = useMemo(() => data?.questions ?? [], [data?.questions]);
  const q = questions[qi];
  const isLast = qi === questions.length - 1;
  const skillId = skillIdProp ?? data?.skillId;
  const backHref = skillId ? `/skills/${skillId}` : `/subtopics/${subtopicId}`;

  const onPick = useCallback(
    (idx: number) => {
      if (!q || answered || mutation.isPending) return;
      setSelected(idx);
      setAnswered(true);
    },
    [q, answered, mutation.isPending],
  );

  // Keyboard navigation for selecting options (1, 2, 3, 4)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (phase !== "quiz" || answered || !q) return;
      const key = e.key;
      if (key >= "1" && key <= String(q.options.length)) {
        const index = parseInt(key) - 1;
        onPick(index);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [phase, answered, q, onPick]);

  const dots = useMemo(
    () =>
      questions.map((_, index) => {
        if (index < answers.length) return "done";
        if (index === qi) return "current";
        return "todo";
      }),
    [questions, answers.length, qi],
  );

  function onContinue() {
    if (selected === null) return;
    const nextAnswers = [...answers];
    nextAnswers[qi] = selected;
    setAnswers(nextAnswers);

    if (isLast) {
      mutation.mutate(nextAnswers);
    } else {
      setQi((i) => i + 1);
      setSelected(null);
      setAnswered(false);
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-col gap-4 px-5 py-8 md:py-12">
        <Skeleton className="h-10 w-10 rounded-xl bg-[#1F2440]" />
        <Skeleton className="h-4 w-32 rounded bg-[#1F2440]" />
        <Skeleton className="h-60 w-full rounded-2xl bg-[#171B2E]" />
      </div>
    );
  }

  if (data?.status === "ready_tomorrow") {
    return (
      <main className="mx-auto w-full max-w-lg px-5 py-8 md:py-12 text-[#EDEFF7]">
        <Link
          href={`/subtopics/${subtopicId}`}
          className="mb-5 inline-flex size-10 items-center justify-center rounded-xl border border-[#2A2F4A] bg-[#1F2440] text-[#EDEFF7] transition-colors hover:border-[#5EEAD4]/30 hover:text-[#5EEAD4]"
          aria-label="Back to lesson"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div className="rounded-2xl border border-[#FBBF24]/30 bg-[#171B2E] p-6 shadow-[0_8px_32px_rgba(0,0,0,0.35)]">
          <div className="flex size-12 items-center justify-center rounded-xl bg-[#FBBF24]/10 text-[#FBBF24]">
            <BookOpen className="size-6" />
          </div>
          <h2 className="mt-4 font-heading text-lg font-bold text-[#EDEFF7]">
            Ready in tomorrow’s batch
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[#8B93B0]">
            Quiz questions will generate in the next daily batch run. Check back tomorrow!
          </p>
        </div>
      </main>
    );
  }

  if (isError || !data || questions.length === 0) {
    return (
      <main className="mx-auto w-full max-w-lg px-5 py-8 md:py-12 text-[#EDEFF7]">
        <Link
          href={`/subtopics/${subtopicId}`}
          className="mb-5 inline-flex size-10 items-center justify-center rounded-xl border border-[#2A2F4A] bg-[#1F2440] text-[#EDEFF7] transition-colors hover:border-[#5EEAD4]/30 hover:text-[#5EEAD4]"
          aria-label="Back to lesson"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div className="rounded-2xl border border-[#FB7185]/30 bg-[#FB7185]/5 p-6 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-[#FB7185]/10 text-[#FB7185]">
            <AlertTriangle className="size-6" />
          </div>
          <h2 className="mt-4 font-heading text-lg font-bold text-[#EDEFF7]">
            Quiz unavailable
          </h2>
          <p className="mt-2 text-sm text-[#8B93B0]">
            {error instanceof Error ? error.message : "No quiz questions could be loaded."}
          </p>
          <div className="mt-6">
            <button
              type="button"
              onClick={() => void refetch()}
              className={cn(
                "inline-flex h-11 items-center justify-center rounded-xl bg-[#1F2440] border border-[#2A2F4A] px-5 text-sm font-semibold text-[#EDEFF7] hover:bg-[#1F2440]/80",
              )}
            >
              Try Again
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (phase === "result" && result) {
    const passed = result.passed;
    return (
      <main className="relative mx-auto flex min-h-full w-full max-w-lg flex-col items-center justify-center overflow-x-hidden px-5 py-10 md:px-6 text-[#EDEFF7]">
        {passed && !reduceMotion && (
          <motion.div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,rgba(94,234,212,0.15)_0%,transparent_70%)]"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: [0, 1, 0.35], scale: [0.9, 1.05, 1] }}
            transition={{ duration: 0.9, ease: "easeOut" }}
          />
        )}

        <div className="relative flex w-full flex-col items-center gap-6">
          {/* Result Icon */}
          <div
            className={cn(
              "flex size-16 items-center justify-center rounded-full border-2 transition-all",
              passed
                ? "border-[#5EEAD4] bg-[#5EEAD4]/15 shadow-[0_0_24px_rgba(94,234,212,0.3)]"
                : "border-[#FB7185] bg-[#FB7185]/15 shadow-[0_0_24px_rgba(251,113,133,0.3)]",
            )}
          >
            {passed ? (
              <Check className="size-7 text-[#5EEAD4]" strokeWidth={3} />
            ) : (
              <X className="size-7 text-[#FB7185]" strokeWidth={3} />
            )}
          </div>

          {/* Heading */}
          <div className="text-center">
            <h2 className="font-heading text-2xl font-bold text-[#EDEFF7]">
              {passed ? "Lesson completed!" : "Quiz failed"}
            </h2>
            <p className="mt-2 text-sm text-[#8B93B0] max-w-sm mx-auto leading-relaxed">
              {passed
                ? "Congratulations! You've passed the quiz and completed this subtopic lesson."
                : "You scored below the 70% passing threshold. Please review the lesson content and try again."}
            </p>
          </div>

          {/* Score Grid details */}
          <div className="grid w-full grid-cols-2 gap-4 rounded-xl border border-[#2A2F4A] bg-[#171B2E] p-4 text-center">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.5px] text-[#8B93B0]">
                Your Score
              </p>
              <p className={cn("mt-1 text-2xl font-bold font-mono", passed ? "text-[#5EEAD4]" : "text-[#FB7185]")}>
                {result.score}%
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.5px] text-[#8B93B0]">
                Correct Questions
              </p>
              <p className="mt-1 text-2xl font-bold font-mono text-[#EDEFF7]">
                {result.correctCount} / {result.total}
              </p>
            </div>
          </div>

          {/* Simplified explanation drawer for repeated failures */}
          {!passed && result.simplifiedExplanation && (
            <div className="w-full rounded-xl border border-[#FBBF24]/30 bg-[#FBBF24]/5 p-5">
              <button
                type="button"
                onClick={() => setShowSimple((v) => !v)}
                className="flex w-full items-center justify-between font-heading text-xs font-bold uppercase tracking-[0.5px] text-[#FBBF24] focus-visible:outline-none"
              >
                <span className="flex items-center gap-1.5">
                  <HelpCircle className="size-4" />
                  {showSimple ? "Hide" : "Show"} Simpler Explanation
                </span>
                <span className="text-[10px]">{showSimple ? "▲" : "▼"}</span>
              </button>
              {showSimple && (
                <div className="mt-3 border-t border-[#FBBF24]/20 pt-3">
                  <MarkdownContent content={result.simplifiedExplanation} />
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex w-full flex-col gap-3">
            {passed ? (
              <Link
                href={backHref}
                className={cn(
                  "inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#5EEAD4] font-heading text-sm font-bold text-[#0E1220] transition-all",
                  "shadow-[0_0_24px_rgba(94,234,212,0.25)] hover:bg-[#5EEAD4]/90 hover:shadow-[0_0_32px_rgba(94,234,212,0.35)]",
                )}
              >
                <Play className="size-4 fill-current stroke-none" />
                Continue Learning
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setPhase("quiz");
                  setResult(null);
                  setQi(0);
                  setAnswers([]);
                  setSelected(null);
                  setAnswered(false);
                  setShowSimple(false);
                }}
                className={cn(
                  "inline-flex h-12 items-center justify-center rounded-xl bg-[#FB7185] font-heading text-sm font-bold text-[#0E1220] transition-all",
                  "shadow-[0_0_24px_rgba(251,113,133,0.25)] hover:bg-[#FB7185]/90 hover:shadow-[0_0_32px_rgba(251,113,133,0.35)]",
                )}
              >
                Try Again
              </button>
            )}
            <Link
              href={`/subtopics/${subtopicId}`}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-[#2A2F4A] bg-[#1F2440]/30 text-sm font-semibold text-[#8B93B0] transition-colors hover:text-[#EDEFF7]"
            >
              Review Lesson Content
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const isCorrect = selected === q.correctAnswerIndex;

  return (
    <main className="mx-auto flex min-h-full w-full max-w-lg flex-col overflow-x-hidden px-5 py-6 md:px-6 md:py-8 text-[#EDEFF7]">
      {/* Header metadata breadcrumbs & progress bar */}
      <div className="mb-6 flex items-center gap-3">
        <Link
          href={`/subtopics/${subtopicId}`}
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-[#2A2F4A] bg-[#1F2440] text-[#EDEFF7] transition-colors hover:border-[#5EEAD4]/30 hover:text-[#5EEAD4]"
          aria-label="Back to lesson"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div className="flex flex-1 items-center justify-center gap-1.5">
          {dots.map((state, index) => (
            <span
              key={index}
              className={cn(
                "size-2 rounded-full transition-all duration-300",
                state === "done" && "bg-[#5EEAD4]",
                state === "current" && "bg-[#5EEAD4] scale-125 shadow-[0_0_8px_rgba(94,234,212,0.8)]",
                state === "todo" && "bg-[#2A2F4A]",
              )}
            />
          ))}
        </div>
        <span className="w-10 text-right font-mono text-xs text-[#8B93B0]">
          {qi + 1} / {questions.length}
        </span>
      </div>

      {/* Main Question Card wrapper */}
      <div className="rounded-2xl border border-[#2A2F4A] bg-[#171B2E] p-5 shadow-[0_8px_32px_rgba(0,0,0,0.3)] md:p-6">
        <span className="text-[10px] font-bold uppercase tracking-[0.5px] text-[#5EEAD4]">
          Question {qi + 1} of {questions.length}
        </span>
        <h2 className="mt-2 font-heading text-base font-semibold leading-snug text-[#EDEFF7] md:text-lg">
          {q.question}
        </h2>

        {/* Options grid buttons */}
        <div className="mt-5 flex flex-col gap-3" role="radiogroup" aria-label="Answer options">
          {q.options.map((option, idx) => {
            const isSelected = selected === idx;
            const showTeal = answered && idx === q.correctAnswerIndex;
            const showCoral = answered && isSelected && !isCorrect;

            return (
              <button
                key={idx}
                type="button"
                role="radio"
                aria-checked={isSelected}
                disabled={answered || mutation.isPending}
                onClick={() => onPick(idx)}
                className={cn(
                  "min-h-12 w-full rounded-xl border px-4 py-3.5 text-left text-sm transition-all",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5EEAD4]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#171B2E]",
                  "border-[#2A2F4A] bg-[#1F2440] text-[#EDEFF7]",
                  !answered && "hover:border-[#5EEAD4]/30 hover:bg-[#1F2440]/80",
                  isSelected && !answered && "border-[#5EEAD4]/40 bg-[#1F2440]/90",
                  showTeal && "border-[#5EEAD4] bg-[#5EEAD4]/10 text-[#5EEAD4] font-semibold",
                  showCoral && "border-[#FB7185] bg-[#FB7185]/10 text-[#FB7185]",
                  answered && !showTeal && !showCoral && "opacity-35 border-[#2A2F4A]",
                )}
              >
                <div className="flex items-start gap-3">
                  <span className="font-mono text-xs font-bold text-[#8B93B0] mt-0.5">
                    {idx + 1}
                  </span>
                  <span className="flex-1 break-words">{option}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Feedback display section */}
        {answered && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-6 border-t border-[#2A2F4A] pt-5"
          >
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.5px]",
                  isCorrect ? "bg-[#5EEAD4]/10 text-[#5EEAD4]" : "bg-[#FB7185]/10 text-[#FB7185]",
                )}
              >
                {isCorrect ? "Correct!" : "Incorrect"}
              </span>
            </div>
            {q.explanation && (
              <p className="mt-3 text-[13px] leading-relaxed text-[#8B93B0]">
                {q.explanation}
              </p>
            )}

            {/* Explicit Continue button to proceed to the next question */}
            <div className="mt-5">
              <button
                type="button"
                onClick={onContinue}
                className={cn(
                  "inline-flex h-11 w-full items-center justify-center rounded-xl bg-[#5EEAD4] font-heading text-sm font-bold text-[#0E1220] transition-colors hover:bg-[#5EEAD4]/90",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5EEAD4]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#171B2E]",
                )}
              >
                {isLast ? "Finish Quiz" : "Continue"}
              </button>
            </div>
          </motion.div>
        )}

        {mutation.isPending && (
          <div className="mt-6 border-t border-[#2A2F4A] pt-5 text-center">
            <p className="flex items-center justify-center gap-2 text-sm text-[#8B93B0]">
              <Loader2 className="size-4 animate-spin text-[#5EEAD4]" />
              Scoring quiz answers...
            </p>
          </div>
        )}

        {mutation.isError && (
          <div className="mt-6 border-t border-[#2A2F4A] pt-5 text-center">
            <p className="text-sm text-[#FB7185]">
              {mutation.error instanceof Error ? mutation.error.message : "Failed to submit quiz."}
            </p>
            <button
              type="button"
              onClick={onContinue}
              className="mt-3 text-xs font-bold uppercase tracking-[0.5px] text-[#5EEAD4] hover:underline"
            >
              Retry Submit
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
