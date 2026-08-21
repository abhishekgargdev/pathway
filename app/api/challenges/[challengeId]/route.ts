import { Types } from "mongoose";
import { NextResponse } from "next/server";

import { requireSession, withDb } from "@/lib/api";
import type { ChallengeGetResponse } from "@/lib/challenges/types";
import { lazyEnsureCodingChallenge } from "@/lib/queue/lazy";
import { CodingChallenge } from "@/models/CodingChallenge";
import { Skill } from "@/models/Skill";
import { SolutionAnalysis } from "@/models/SolutionAnalysis";
import { Submission } from "@/models/Submission";
import { Topic } from "@/models/Topic";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export type { ChallengeGetResponse } from "@/lib/challenges/types";

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

  let challenge = await CodingChallenge.findById(id).lean().exec();
  if (!challenge) {
    return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
  }

  const skill = await Skill.findOne({ _id: challenge.skillId, userId: session!.user.id }).lean().exec();
  if (!skill) {
    return NextResponse.json({ error: "Challenge not found or unauthorized" }, { status: 404 });
  }

  let responseStatus: ChallengeGetResponse["status"] = "ready";
  let message: string | undefined;

  const needsGen =
    challenge.status !== "ready" ||
    !challenge.prompt?.trim() ||
    !(challenge.testCases?.length);

  if (needsGen) {
    const lazy = await lazyEnsureCodingChallenge(challengeId);
    if (lazy.status === "ready_tomorrow") {
      responseStatus = "ready_tomorrow";
      message = "Challenge will be ready in tomorrow's batch.";
    } else if (lazy.status === "error") {
      responseStatus = "error";
      message = lazy.message;
    } else {
      challenge = await CodingChallenge.findById(id).lean().exec();
      if (!challenge) {
        return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
      }
      responseStatus =
        challenge.status === "ready" && (challenge.testCases?.length ?? 0) > 0
          ? "ready"
          : "generating";
    }
  }
  let topicTitle: string | null = null;
  if (challenge.topicId) {
    const topic = await Topic.findById(challenge.topicId).lean().exec();
    topicTitle = topic?.title ?? null;
  }

  const latest = await Submission.findOne({ challengeId: id })
    .sort({ submittedAt: -1 })
    .lean()
    .exec();

  const passing = await Submission.findOne({
    challengeId: id,
    allPassed: true,
  })
    .lean()
    .exec();

  const analysis = await SolutionAnalysis.findOne({ challengeId: id })
    .select("_id")
    .lean()
    .exec();

  const submissions = await Submission.find({ challengeId: id })
    .sort({ submittedAt: -1 })
    .limit(10)
    .lean()
    .exec();

  const testCases = challenge.testCases ?? [];
  const visible = testCases.filter((t) => !t.hidden);

  const body: ChallengeGetResponse = {
    status: responseStatus,
    message,
    challenge:
      challenge.status === "ready" || challenge.prompt
        ? {
            id: challenge._id.toString(),
            skillId: challenge.skillId.toString(),
            topicId: challenge.topicId?.toString() ?? null,
            skillName: skill?.name ?? "Skill",
            topicTitle,
            prompt: challenge.prompt,
            difficulty: challenge.difficulty ?? null,
            constraints: challenge.constraints ?? [],
            visibleTestCases: visible.map((t) => ({
              input: t.input ?? "",
              expectedOutput: t.expectedOutput ?? "",
            })),
            totalTestCount: testCases.length,
          }
        : null,
    latestSubmission: latest
      ? {
          id: latest._id.toString(),
          language: latest.language,
          code: latest.code,
          allPassed: latest.allPassed,
          submittedAt: latest.submittedAt.toISOString(),
          testResults: (latest.testResults ?? []).map((r) => ({
            input: r.input ?? "",
            expected: r.expected ?? "",
            actual: r.actual ?? "",
            passed: Boolean(r.passed),
          })),
        }
      : null,
    hasPassingSubmission: Boolean(passing),
    hasAnalysis: Boolean(analysis),
    recentSubmissions: submissions.map((s) => {
      const total = s.testResults?.length ?? 0;
      const passedCount = s.testResults?.filter((r) => r.passed).length ?? 0;
      const score = total === 0 ? 0 : Math.round((passedCount / total) * 100);
      return {
        id: s._id.toString(),
        language: s.language,
        allPassed: s.allPassed,
        submittedAt: s.submittedAt.toISOString(),
        score,
      };
    }),
  };

  return NextResponse.json(body);
}
