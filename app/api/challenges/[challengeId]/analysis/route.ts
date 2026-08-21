import { Types } from "mongoose";
import { NextResponse } from "next/server";

import { requireSession, withDb } from "@/lib/api";
import type { SolutionAnalysisResponse } from "@/lib/challenges/types";
import { ensureSolutionAnalysis } from "@/lib/queue/lazy";
import { CodingChallenge } from "@/models/CodingChallenge";
import { Skill } from "@/models/Skill";
import { SolutionAnalysis } from "@/models/SolutionAnalysis";
import { Submission } from "@/models/Submission";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export type { SolutionAnalysisResponse } from "@/lib/challenges/types";

type RouteContext = { params: Promise<{ challengeId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { challengeId } = await context.params;
  if (!Types.ObjectId.isValid(challengeId)) {
    return NextResponse.json({ error: "Invalid challenge id" }, { status: 400 });
  }

  await withDb();
  const id = new Types.ObjectId(challengeId);

  const challenge = await CodingChallenge.findById(id).lean().exec();
  if (!challenge) {
    return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
  }

  const skill = await Skill.findOne({ _id: challenge.skillId, userId: session!.user.id }).lean().exec();
  if (!skill) {
    return NextResponse.json({ error: "Skill not found or unauthorized" }, { status: 404 });
  }

  const passing = await Submission.findOne({
    challengeId: id,
    userId: session!.user.id,
    allPassed: true,
  })
    .sort({ submittedAt: -1 })
    .lean()
    .exec();

  if (!passing) {
    const body: SolutionAnalysisResponse = {
      status: "forbidden",
      message: "Pass all tests before viewing solution analysis.",
      skillId: challenge.skillId.toString(),
      analysis: null,
    };
    return NextResponse.json(body, { status: 403 });
  }
  const skillId = challenge.skillId.toString();

  const cached = await SolutionAnalysis.findOne({ challengeId: id }).lean().exec();
  if (cached?.yourSolution && cached.alternatives?.length === 5) {
    const body: SolutionAnalysisResponse = {
      status: "ready",
      skillId,
      analysis: {
        challengeId: id.toString(),
        yourSolution: {
          timeComplexity: cached.yourSolution.timeComplexity ?? "",
          spaceComplexity: cached.yourSolution.spaceComplexity ?? "",
          reasoning: cached.yourSolution.reasoning ?? "",
          feedback: cached.yourSolution.feedback ?? "",
        },
        alternatives: cached.alternatives.map((alt) => ({
          code: alt.code ?? "",
          language: alt.language ?? passing.language,
          conceptsUsed: alt.conceptsUsed ?? [],
          dsaConcepts: alt.dsaConcepts ?? [],
          timeComplexity: alt.timeComplexity ?? "",
          spaceComplexity: alt.spaceComplexity ?? "",
          reasoning: alt.reasoning ?? "",
        })),
        generatedAt: cached.generatedAt.toISOString(),
        submission: {
          language: passing.language,
          code: passing.code,
        },
      },
    };
    return NextResponse.json(body);
  }

  const ensured = await ensureSolutionAnalysis({
    challengeId: id,
    skillName: skill?.name ?? "Skill",
    challengePrompt: challenge.prompt,
    language: passing.language,
    code: passing.code,
  });

  if (ensured.status === "ready_tomorrow") {
    const body: SolutionAnalysisResponse = {
      status: "ready_tomorrow",
      message: "Analysis will be ready in tomorrow's batch.",
      skillId,
      analysis: null,
    };
    return NextResponse.json(body);
  }

  if (ensured.status === "error") {
    const body: SolutionAnalysisResponse = {
      status: "error",
      message: ensured.message,
      skillId,
      analysis: null,
    };
    return NextResponse.json(body, { status: 502 });
  }

  const saved = await SolutionAnalysis.findOne({ challengeId: id }).lean().exec();

  const body: SolutionAnalysisResponse = {
    status: "ready",
    skillId,
    analysis: {
      challengeId: id.toString(),
      yourSolution: ensured.data.yourSolution,
      alternatives: ensured.data.alternatives,
      generatedAt: (saved?.generatedAt ?? new Date()).toISOString(),
      submission: {
        language: passing.language,
        code: passing.code,
      },
    },
  };

  return NextResponse.json(body);
}
