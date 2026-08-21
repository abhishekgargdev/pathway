"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, Check, Loader2, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

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
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
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

  const questions = data?.questions ?? [];
  const q = questions[qi];
  const isLast = qi === questions.length - 1;
  const skillId = skillIdProp ?? data?.skillId;
  const backHref = skillId ? `/skills/${skillId}` : `/subtopics/${subtopicId}`;

  const dots = useMemo(
    () =>
      questions.map((_, index) => {
        if (index < answers.length) return "done";
        if (index === qi) return "current";
        return "todo";
      }),
    [questions, answers.length, qi],
  );

  function onPick(idx: number) {
    if (!q || feedback || mutation.isPending || selected !== null) return;
    setSelected(idx);
    const isCorrect = idx === q.correctAnswerIndex;
    setFeedback(isCorrect ? "correct" : "wrong");

    window.setTimeout(() => {
      const nextAnswers = [...answers];
      nextAnswers[qi] = idx;
      setAnswers(nextAnswers);

      if (isLast) {
        mutation.mutate(nextAnswers);
      } else {
        setQi((i) => i + 1);
        setSelected(null);
        setFeedback(null);
      }
    }, 650);
  }

  if (isLoading) {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-col gap-4 px-5 py-6">
        <Skeleton className="h-9 w-9 rounded-[10px] bg-[#1F2440]" />
        <Skeleton className="h-4 w-32 rounded bg-[#1F2440]" />
        <Skeleton className="h-40 w-full rounded-2xl bg-[#171B2E]" />
      </div>
    );
  }

  if (data?.status === "ready_tomorrow") {
    return (
      <main className="mx-auto w-full max-w-lg px-5 py-6">
        <Link
          href={`/subtopics/${subtopicId}`}
          className="mb-4 inline-flex size-9 items-center justify-center rounded-[10px] border border-[#2A2F4A] bg-[#1F2440] text-[#EDEFF7]"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div className="rounded-2xl border border-[#FBBF24]/25 bg-[#171B2E] p-5">
          <p className="font-heading text-lg font-semibold text-[#EDEFF7]">
            Ready in tomorrow’s batch
          </p>
          <p className="mt-2 text-sm text-[#8B93B0]">
            Quiz questions will generate in the next daily run.
          </p>
        </div>
      </main>
    );
  }

  if (isError || !data || questions.length === 0) {
    return (
      <main className="mx-auto w-full max-w-lg px-5 py-6">
        <Link
          href={`/subtopics/${subtopicId}`}
          className="mb-4 inline-flex size-9 items-center justify-center rounded-[10px] border border-[#2A2F4A] bg-[#1F2440] text-[#EDEFF7]"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div className="rounded-2xl border border-[#FB7185]/30 bg-[#FB7185]/10 p-4 text-sm text-[#FB7185]">
          {error instanceof Error ? error.message : "Quiz unavailable."}
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

  if (phase === "result" && result) {
    const passed = result.passed;
    return (
      <main className="relative mx-auto flex min-h-full w-full max-w-lg flex-col items-center justify-center overflow-x-hidden px-5 py-10 md:px-6">
        {passed && !reduceMotion ? (
          <motion.div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,rgba(94,234,212,0.2)_0%,transparent_70%)]"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: [0, 1, 0.35], scale: [0.9, 1.05, 1] }}
            transition={{ duration: 0.9, ease: "easeOut" }}
          />
        ) : null}

        <div className="relative flex w-full flex-col items-center gap-5">
          <div
            className={cn(
              "flex size-[72px] items-center justify-center rounded-full border-2",
              passed
                ? "border-[#5EEAD4] bg-[#5EEAD4]/15 shadow-[0_0_24px_rgba(94,234,212,0.3)]"
                : "border-[#FB7185] bg-[#FB7185]/15 shadow-[0_0_24px_rgba(251,113,133,0.3)]",
            )}
          >
            {passed ? (
              <Check className="size-8 text-[#5EEAD4]" strokeWidth={2.5} />
            ) : (
              <X className="size-8 text-[#FB7185]" strokeWidth={2.5} />
            )}
          </div>

          <div className="text-center">
            <h2 className="font-heading text-2xl font-bold text-[#EDEFF7]">
              {passed ? "Quiz passed!" : "Not quite"}
            </h2>
            <p className="mt-2 text-[15px] leading-relaxed text-[#8B93B0]">
              {passed
                ? `You scored ${result.score}% (${result.correctCount}/${result.total}).`
                : `You scored ${result.score}%. Need 70% to pass — review and retry.`}
            </p>
          </div>

          {!passed && result.consecutiveFails >= 2 ? (
            <div className="w-full rounded-2xl border border-[#2A2F4A] bg-[#171B2E] p-4 shadow-[0_4px_16px_rgba(0,0,0,0.25)]">
              <button
                type="button"
                onClick={() => setShowSimple((v) => !v)}
                className="text-sm font-medium text-[#5EEAD4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5EEAD4]/40"
              >
                {showSimple ? "Hide" : "Show"} simpler explanation
              </button>
              {showSimple && result.simplifiedExplanation ? (
                <div className="mt-3 border-t border-[#2A2F4A] pt-3">
                  <MarkdownContent content={result.simplifiedExplanation} />
                </div>
              ) : showSimple ? (
                <p className="mt-3 text-sm text-[#8B93B0]">
                  A simpler explanation isn’t available yet (quota may be
                  exhausted).
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="flex w-full flex-col gap-3">
            {passed ? (
              <Link
                href={backHref}
                className="inline-flex h-11 min-h-11 items-center justify-center rounded-xl bg-[#5EEAD4] font-heading text-sm font-semibold text-[#0E1220] shadow-[0_0_24px_rgba(94,234,212,0.3)]"
              >
                Back to path
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
                  setFeedback(null);
                  setShowSimple(false);
                }}
                className="inline-flex h-11 min-h-11 items-center justify-center rounded-xl border border-[#2A2F4A] bg-[#171B2E] text-sm font-medium text-[#EDEFF7]"
              >
                Try again
              </button>
            )}
            <Link
              href={`/subtopics/${subtopicId}`}
              className="inline-flex h-11 min-h-11 items-center justify-center rounded-xl text-sm text-[#8B93B0] hover:text-[#EDEFF7]"
            >
              Review lesson
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-full w-full max-w-lg flex-col overflow-x-hidden px-5 py-6 md:px-6 md:py-8">
      <div className="mb-5 flex items-center gap-3">
        <Link
          href={`/subtopics/${subtopicId}`}
          className="inline-flex size-9 items-center justify-center rounded-[10px] border border-[#2A2F4A] bg-[#1F2440] text-[#EDEFF7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5EEAD4]/40"
          aria-label="Back to lesson"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div className="flex flex-1 items-center justify-center gap-1.5">
          {dots.map((state, index) => (
            <span
              key={index}
              className={cn(
                "size-2 rounded-full",
                state === "done" && "bg-[#5EEAD4]",
                state === "current" &&
                  "bg-[#5EEAD4] shadow-[0_0_8px_rgba(94,234,212,0.6)]",
                state === "todo" && "bg-[#2A2F4A]",
              )}
            />
          ))}
        </div>
        <span className="w-9 text-right font-mono text-xs text-[#8B93B0]">
          {qi + 1}/{questions.length}
        </span>
      </div>

      <div className="rounded-2xl border border-[#2A2F4A] bg-[#171B2E] p-5 shadow-[0_4px_16px_rgba(0,0,0,0.25)]">
        <p className="font-heading text-[17px] font-semibold leading-snug text-[#EDEFF7]">
          {q!.question}
        </p>

        <div className="mt-5 flex flex-col gap-3">
          {q!.options.map((option, idx) => {
            const isSelected = selected === idx;
            const showTeal = feedback === "correct" && isSelected;
            const showCoral = feedback === "wrong" && isSelected;
            const showCorrectReveal =
              feedback === "wrong" && idx === q!.correctAnswerIndex;

            return (
              <button
                key={idx}
                type="button"
                disabled={feedback !== null || mutation.isPending}
                onClick={() => onPick(idx)}
                className={cn(
                  "min-h-12 rounded-xl border px-4 py-3 text-left text-sm transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5EEAD4]/40",
                  "border-[#2A2F4A] bg-[#1F2440] text-[#EDEFF7]",
                  isSelected && !feedback && "border-[#5EEAD4]/40",
                  showTeal &&
                    "border-[#5EEAD4] bg-[#5EEAD4]/15 text-[#5EEAD4]",
                  showCoral &&
                    "border-[#FB7185] bg-[#FB7185]/15 text-[#FB7185]",
                  showCorrectReveal && "border-[#5EEAD4]/50",
                )}
              >
                {option}
              </button>
            );
          })}
        </div>

        {feedback === "wrong" && q!.explanation ? (
          <p className="mt-4 text-[13px] leading-relaxed text-[#8B93B0]">
            {q!.explanation}
          </p>
        ) : null}

        {mutation.isPending ? (
          <p className="mt-4 flex items-center gap-2 text-sm text-[#8B93B0]">
            <Loader2 className="size-4 animate-spin" /> Scoring…
          </p>
        ) : null}
        {mutation.isError ? (
          <p className="mt-4 text-sm text-[#FB7185]">
            {mutation.error instanceof Error
              ? mutation.error.message
              : "Submit failed"}
          </p>
        ) : null}
      </div>
    </main>
  );
}
