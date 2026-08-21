<!-- BEGIN:nextjs-agent-rules -->

# Pathway — Project Context

Single-user, AI-powered learning app. Stack: Next.js App Router + TypeScript, shadcn/ui + Tailwind, MongoDB + Mongoose, NextAuth Credentials (one seeded user, no signup), Gemini API (6 rotating keys, daily quota tracked per key), Piston API for code execution, TanStack Query client-side, Framer Motion for animation.

## Folder structure
(paste the folder tree from Part B of the build doc here, under app/, models/, lib/, scripts/, figma/)

## Database schema (Mongoose — create one file per model in models/)

User: { email: String required unique, passwordHash: String required, createdAt: Date default now }

Skill: { name: String required, description: String, status: enum [active, archived] default active, source: enum [user-added, ai-suggested] default user-added, createdAt: Date default now }

Topic: { skillId: ObjectId ref Skill required, title: String required, order: Number required, status: enum [pending, generating, ready] default pending, createdAt: Date default now }

Subtopic: { topicId: ObjectId ref Topic required, title: String required, order: Number required, status: enum [pending, generating, ready] default pending, createdAt: Date default now }

Content: { subtopicId: ObjectId ref Subtopic required unique, body: String required (markdown), examples: [{ title: String, explanation: String, code: String, language: String }], generatedAt: Date, generatedByKeyIndex: Number, version: Number default 1 }

QuizQuestion: { subtopicId: ObjectId ref Subtopic required, question: String required, options: [String] required, correctAnswerIndex: Number required, explanation: String }

QuizAttempt: { subtopicId: ObjectId ref Subtopic required, answers: [Number], score: Number, passed: Boolean, attemptedAt: Date default now }

Progress: { skillId: ObjectId ref Skill required, topicId: ObjectId ref Topic, subtopicId: ObjectId ref Subtopic, status: enum [not-started, in-progress, completed] default not-started, lastVisitedAt: Date }

CodingChallenge: { skillId: ObjectId ref Skill required, topicId: ObjectId ref Topic, prompt: String required, difficulty: enum [easy, medium, hard], constraints: [String], testCases: [{ input: String, expectedOutput: String, hidden: Boolean }], status: enum [pending, generating, ready] default pending, createdAt: Date default now }

Submission: { challengeId: ObjectId ref CodingChallenge required, language: String required, code: String required, testResults: [{ input: String, expected: String, actual: String, passed: Boolean }], allPassed: Boolean default false, submittedAt: Date default now }

SolutionAnalysis: { challengeId: ObjectId ref CodingChallenge required unique, yourSolution: { timeComplexity: String, spaceComplexity: String, reasoning: String, feedback: String }, alternatives: [{ code: String, language: String, conceptsUsed: [String], dsaConcepts: [String], timeComplexity: String, spaceComplexity: String, reasoning: String }] (exactly 5 entries), generatedAt: Date default now }

GenerationQueue: { targetType: enum [topic-outline, subtopic-content, quiz, coding-challenge], targetId: ObjectId, skillId: ObjectId ref Skill, priority: Number default 0, status: enum [queued, processing, done, failed] default queued, attempts: Number default 0, lastError: String, createdAt: Date default now }

AiUsageLog: { keyIndex: Number required (1-6), date: String required (YYYY-MM-DD), callsUsed: Number default 0, tokensUsed: Number default 0 } — unique compound index on (keyIndex, date)

## API route map

- POST /api/auth/[...nextauth] — NextAuth credentials login
- GET /api/dashboard — auth required; returns streak, continue-card target, active skills with % complete, today's newly-ready flags
- POST /api/skills — auth required; body { name }; creates Skill, makes one Gemini call for topic/subtopic outline, inserts Topic/Subtopic docs (status pending), enqueues GenerationQueue rows for each, returns the new skill + outline
- GET /api/skills/:skillId/tree — auth required; returns Topics + nested Subtopics with status and Progress joined in
- GET /api/subtopics/:subtopicId — auth required; if Content missing/pending, triggers a single lazy generation call (respecting quota) before responding; returns content + examples + status
- POST /api/subtopics/:subtopicId/quiz — auth required; body { answers: number[] }; scores against QuizQuestion.correctAnswerIndex, saves QuizAttempt, updates Progress, if failed twice in a row triggers one Gemini call for a simplified explanation
- GET /api/challenges/:challengeId — auth required; returns prompt/constraints/visible test cases
- POST /api/challenges/:challengeId/submit — auth required; body { language, code }; sends to Piston with test cases, stores Submission with per-test results
- GET /api/challenges/:challengeId/analysis — auth required; only valid once a Submission has allPassed true; returns cached SolutionAnalysis or generates one (one Gemini call, Zod-validated, exactly 5 alternatives + your-solution analysis), caches by challengeId
- GET /api/manage/queue — auth required; returns GenerationQueue rows + today's AiUsageLog per key
- POST /api/manage/regenerate — auth required; body { queueItemId }; resets item to queued/attempts 0
- GET /api/cron/generate — requires header matching CRON_SECRET; batch-drains GenerationQueue within quota headroom, see pipeline below

## AI generation pipeline (critical — do not generate content in bulk)

Content is never generated all at once. Adding a skill only generates its outline (titles, one small call). Every Topic/Subtopic/Quiz/Challenge starts as a GenerationQueue row with status "queued". Two things drain the queue:
1. The daily cron (/api/cron/generate) — reads today's AiUsageLog per key, computes remaining quota (GEMINI_DAILY_LIMIT_PER_KEY env var per key), pulls top-priority queued items up to ~70% of remaining quota (leaving headroom for lazy generation), generates each via the next available key in rotation, validates the JSON response against a Zod schema in lib/gemini/schemas.ts before saving, marks done/failed, increments AiUsageLog.
2. Lazy fallback — if a user opens a subtopic/challenge still pending, one single generation call fires inline (same quota check; if all keys are exhausted for the day, show "ready in tomorrow's batch" instead of erroring).

Key rotation lives in lib/gemini/client.ts: round-robin across GEMINI_KEY_1..6, skip any key at/over its daily limit, throw a typed error if all 6 are exhausted so callers can show the right UI state.

## Design tokens

Background #0E1220, surface #171B2E, surface-raised #1F2440, text #EDEFF7 / muted #8B93B0, accent teal #5EEAD4 (active/progress), amber #FBBF24 (streak/success), coral #FB7185 (errors/failed tests), gradient teal→violet (#5EEAD4 → #8B7CF6) for hero/celebratory moments only. Space Grotesk (headings), Inter (body), JetBrains Mono (code/data/complexity). Radius: 16px cards, 12px buttons/inputs, full pills. Every screen has consistent outer padding (20px mobile → 24-32px desktop) and consistent gap (12-16px) between stacked cards — nothing ever touches the viewport edge or another element with zero gap. Resting cards get a soft neutral shadow; active/elevated elements (continue card, in-progress node, streak card) get a colored glow (teal or amber) instead. Signature element: a vertical connected-node path for a skill's topic/subtopic tree (locked/available/in-progress/completed states), echoed in the loading animation as a self-drawing line with a traveling glow dot. Mobile-first: design/verify at 320px, 375px, 430px, then adapt at 768px and 1280px — bottom tab bar (mobile) becomes a left sidebar (desktop).

## Figma export

figma/ contains a Figma Make export — the visual source of truth for layout/spacing intent. For every screen, check figma/ first, extract structure/spacing intent, then re-implement properly with real shadcn components, Tailwind using the tokens above, and Framer Motion for the specified animations — adapt, don't copy-paste wholesale.

Keep this file updated if any architecture decision changes mid-build.

# Folder Struture Target Shape

pathway/
  app/
    page.tsx                          — home (public)
    login/page.tsx
    (app)/
      layout.tsx                      — session guard + shell (nav)
      dashboard/page.tsx
      skills/[skillId]/page.tsx       — learning path
      subtopics/[subtopicId]/page.tsx
      subtopics/[subtopicId]/quiz/page.tsx
      challenges/[challengeId]/page.tsx
      manage/page.tsx
    api/
      auth/[...nextauth]/route.ts
      dashboard/route.ts
      skills/route.ts                 — POST create skill (+outline gen)
      skills/[skillId]/tree/route.ts  — GET topic/subtopic tree
      subtopics/[subtopicId]/route.ts — GET content (lazy-gen fallback)
      subtopics/[subtopicId]/quiz/route.ts
      challenges/[challengeId]/route.ts
      challenges/[challengeId]/submit/route.ts
      challenges/[challengeId]/analysis/route.ts
      manage/queue/route.ts
      manage/regenerate/route.ts
      cron/generate/route.ts          — protected by CRON_SECRET header
  models/
    User.ts, Skill.ts, Topic.ts, Subtopic.ts, Content.ts,
    QuizQuestion.ts, QuizAttempt.ts, Progress.ts,
    CodingChallenge.ts, Submission.ts, SolutionAnalysis.ts,
    GenerationQueue.ts, AiUsageLog.ts
  lib/
    db/connect.ts                     — mongoose singleton connection
    auth.ts                           — NextAuth config
    gemini/client.ts                  — key rotation + quota check
    gemini/schemas.ts                 — Zod schemas per AI response shape
    gemini/prompts.ts                 — prompt templates
    piston/client.ts
    queue/enqueue.ts, queue/process.ts — shared queue helpers used by cron + lazy path
  scripts/seed.ts
  figma/                              — your Figma Make export, extraction source
  AGENTS.md

<!-- END:nextjs-agent-rules -->
