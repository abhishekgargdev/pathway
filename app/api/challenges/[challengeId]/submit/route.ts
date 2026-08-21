import { Types } from "mongoose";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireSession, withDb } from "@/lib/api";
import type { ChallengeSubmitResponse } from "@/lib/challenges/types";
import {
  allTestsPassed,
  PistonApiError,
  PistonExecutionTimeoutError,
  PistonUnsupportedLanguageError,
  runAgainstTestCases,
} from "@/lib/piston/client";
import { CodingChallenge } from "@/models/CodingChallenge";
import { Submission } from "@/models/Submission";
import { Skill } from "@/models/Skill";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export type { ChallengeSubmitResponse } from "@/lib/challenges/types";

type RouteContext = { params: Promise<{ challengeId: string }> };

const bodySchema = z.object({
  language: z.string().min(1),
  code: z.string().min(1),
  /** Preview run: visible tests only, does not persist a Submission. */
  preview: z.boolean().optional(),
});

export async function POST(request: Request, context: RouteContext) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { challengeId } = await context.params;
  if (!Types.ObjectId.isValid(challengeId)) {
    return NextResponse.json({ error: "Invalid challenge id" }, { status: 400 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "language and code are required" },
      { status: 400 },
    );
  }

  await withDb();
  const id = new Types.ObjectId(challengeId);

  const challenge = await CodingChallenge.findById(id).lean().exec();
  if (!challenge) {
    return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
  }

  const skill = await Skill.findOne({ _id: challenge.skillId, userId: session!.user.id }).lean().exec();
  if (!skill) {
    return NextResponse.json({ error: "Challenge not found or unauthorized" }, { status: 404 });
  }

  if (challenge.status !== "ready" || !(challenge.testCases?.length)) {
    return NextResponse.json(
      { error: "Challenge is not ready yet" },
      { status: 409 },
    );
  }

  const preview = Boolean(parsed.data.preview);
  const cases = (challenge.testCases ?? [])
    .filter((t) => (preview ? !t.hidden : true))
    .map((t) => ({
      input: t.input ?? "",
      expectedOutput: t.expectedOutput ?? "",
      hidden: Boolean(t.hidden),
    }));

  if (cases.length === 0) {
    return NextResponse.json(
      { error: "No test cases available" },
      { status: 409 },
    );
  }

  try {
    const results = await runAgainstTestCases({
      language: parsed.data.language,
      code: parsed.data.code,
      testCases: cases.map((c) => ({
        input: c.input,
        expectedOutput: c.expectedOutput,
      })),
    });

    const mapped = results.map((r, index) => ({
      input: r.input,
      expected: r.expected,
      actual: r.actual,
      passed: r.passed,
      hidden: cases[index]?.hidden,
    }));

    // Hide expected/actual details for hidden tests that failed? Spec shows results;
    // for hidden, still show pass/fail but redact input/expected when not preview.
    const publicResults = mapped.map((r) => {
      if (r.hidden && !preview) {
        return {
          input: "(hidden)",
          expected: r.passed ? "(hidden)" : "(hidden)",
          actual: r.passed ? "(hidden)" : r.actual,
          passed: r.passed,
          hidden: true,
        };
      }
      return r;
    });

    const passed = allTestsPassed(results);

    if (preview) {
      const body: ChallengeSubmitResponse = {
        submissionId: "",
        language: parsed.data.language,
        allPassed: passed,
        testResults: publicResults,
        preview: true,
      };
      return NextResponse.json(body);
    }

    const submission = await Submission.create({
      challengeId: id,
      language: parsed.data.language,
      code: parsed.data.code,
      testResults: mapped.map(({ input, expected, actual, passed: p }) => ({
        input,
        expected,
        actual,
        passed: p,
      })),
      allPassed: passed,
    });

    const body: ChallengeSubmitResponse = {
      submissionId: submission._id.toString(),
      language: parsed.data.language,
      allPassed: passed,
      testResults: publicResults,
      preview: false,
    };

    return NextResponse.json(body);
  } catch (err) {
    if (err instanceof PistonUnsupportedLanguageError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof PistonExecutionTimeoutError) {
      return NextResponse.json({ error: err.message }, { status: 408 });
    }
    if (err instanceof PistonApiError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.statusCode && err.statusCode < 500 ? err.statusCode : 502 },
      );
    }
    console.error("challenge submit failed", err);
    return NextResponse.json(
      { error: "Code execution failed" },
      { status: 502 },
    );
  }
}
