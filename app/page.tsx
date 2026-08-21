import Link from "next/link";

import {
  LearningPath,
  MARKETING_PATH_PREVIEW_NODES,
} from "@/components/learning-path/learning-path";
import { ChallengePreview } from "@/components/marketing/challenge-preview";
import { ScrollReveal } from "@/components/marketing/scroll-reveal";
import { PathwayLogo } from "@/components/pathway-logo";
import { cn } from "@/lib/utils";

const steps = [
  {
    num: "01",
    title: "Pick a skill",
    desc: "Name anything — a language, a CS concept, a framework. Pathway generates a structured topic tree for it.",
  },
  {
    num: "02",
    title: "Follow the path",
    desc: "Work through AI-generated subtopics in order. Each one has a lesson, examples, and a short quiz to confirm you got it.",
  },
  {
    num: "03",
    title: "Prove it with code",
    desc: "Every topic ends with a judged coding challenge. Pass the test cases, then study five expert solutions with complexity analysis.",
  },
] as const;

function CtaLink({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href="/login"
      className={cn(
        "inline-flex h-11 min-h-11 items-center justify-center rounded-xl px-6",
        "font-heading text-[15px] font-semibold",
        "bg-[#5EEAD4] text-[#0E1220] shadow-[0_0_28px_rgba(94,234,212,0.32)]",
        "transition-colors hover:bg-[#5EEAD4]/90",
        "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#5EEAD4]/35",
        className,
      )}
    >
      {children}
    </Link>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-full overflow-x-hidden bg-[#0E1220] text-[#EDEFF7]">
      {/* Hero */}
      <section className="relative">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_50%_at_50%_-5%,rgba(94,234,212,0.12)_0%,transparent_70%)]"
          aria-hidden
        />

        <div className="relative mx-auto w-full max-w-6xl px-5 pt-10 pb-10 md:px-6 md:pt-14 md:pb-12 lg:px-8 lg:pt-16">
          <header className="mb-8 flex items-center justify-between gap-4 md:mb-10">
            <div className="flex min-w-0 items-center gap-2">
              <PathwayLogo size={28} />
              <span className="font-heading text-base font-bold tracking-tight text-[#EDEFF7]">
                Pathway
              </span>
            </div>
            <Link
              href="/login"
              className="inline-flex h-11 min-h-11 items-center rounded-xl px-3 text-sm font-medium text-[#8B93B0] transition-colors hover:text-[#EDEFF7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5EEAD4]/40"
            >
              Log in
            </Link>
          </header>

          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-12 xl:gap-16">
            <div className="min-w-0">
              <h1 className="font-heading text-[clamp(1.75rem,6vw,2.5rem)] font-bold leading-[1.15] tracking-[-0.03em] text-[#EDEFF7]">
                Guided through any skill by an{" "}
                <span className="bg-gradient-to-r from-[#5EEAD4] to-[#8B7CF6] bg-clip-text text-transparent">
                  AI-generated learning path
                </span>
                .
              </h1>

              <p className="mt-4 max-w-md text-[15px] leading-relaxed text-[#8B93B0] md:text-base">
                Pick a skill → get a generated path → confirm understanding with
                quick checks → prove it with judged coding challenges.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
                <CtaLink className="w-full sm:w-auto">Log in to Pathway</CtaLink>
              </div>
            </div>

            <div className="min-w-0">
              <p className="mb-3.5 text-[11px] font-semibold tracking-[1px] text-[#8B93B0] uppercase">
                Live path preview
              </p>
              <LearningPath
                title="Data Structures & Algorithms"
                nodes={MARKETING_PATH_PREVIEW_NODES}
                compact
                className="shadow-[0_0_40px_rgba(94,234,212,0.1),0_8px_32px_rgba(0,0,0,0.4)]"
              />
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto w-full max-w-6xl px-5 py-10 md:px-6 md:py-12 lg:px-8 lg:py-14">
        <ScrollReveal>
          <p className="text-[11px] font-semibold tracking-[1px] text-[#8B93B0] uppercase">
            How it works
          </p>
          <h2 className="mt-1.5 font-heading text-[22px] font-bold tracking-[-0.02em] text-[#EDEFF7] md:text-2xl">
            From zero to proven, step by step
          </h2>
        </ScrollReveal>

        <div className="mt-5 grid grid-cols-1 gap-4 md:mt-6 md:grid-cols-3 md:gap-4 lg:gap-5">
          {steps.map((step, index) => (
            <ScrollReveal key={step.num} delay={index * 0.06}>
              <article className="flex h-full gap-4 rounded-2xl border border-[#2A2F4A] bg-[#171B2E] p-5 shadow-[0_4px_16px_rgba(0,0,0,0.25)]">
                <span className="shrink-0 pt-0.5 font-mono text-[13px] font-semibold text-[#5EEAD4]/70">
                  {step.num}
                </span>
                <div className="min-w-0">
                  <h3 className="font-heading text-[15px] font-semibold text-[#EDEFF7]">
                    {step.title}
                  </h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-[#8B93B0]">
                    {step.desc}
                  </p>
                </div>
              </article>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* Challenge preview */}
      <section className="mx-auto w-full max-w-6xl px-5 pb-10 md:px-6 md:pb-12 lg:px-8 lg:pb-14">
        <ScrollReveal>
          <p className="mb-3.5 text-[11px] font-semibold tracking-[1px] text-[#8B93B0] uppercase">
            Not just flashcards
          </p>
          <div className="mx-auto max-w-lg lg:mx-0 lg:max-w-xl">
            <ChallengePreview />
          </div>
        </ScrollReveal>
      </section>

      {/* Closing CTA */}
      <section className="mx-auto w-full max-w-6xl px-5 pb-14 md:px-6 md:pb-16 lg:px-8 lg:pb-20">
        <ScrollReveal>
          <div className="rounded-2xl border border-[#5EEAD4]/20 bg-[linear-gradient(135deg,rgba(94,234,212,0.08),rgba(139,124,246,0.08))] px-6 py-8 text-center shadow-[0_8px_24px_rgba(0,0,0,0.25)] md:px-10 md:py-10">
            <p className="font-heading text-lg font-bold text-[#EDEFF7] md:text-xl">
              Ready to start learning?
            </p>
            <p className="mt-2 text-sm text-[#8B93B0]">
              One skill at a time, fully guided.
            </p>
            <div className="mt-5 flex justify-center">
              <CtaLink>Log in</CtaLink>
            </div>
          </div>
        </ScrollReveal>
      </section>
    </div>
  );
}
