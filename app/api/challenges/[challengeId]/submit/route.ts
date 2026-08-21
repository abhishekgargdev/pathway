import { Types } from "mongoose";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireSession, withDb } from "@/lib/api";
import { getLanguageConfig } from "@/lib/code-runner";
import {
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

type RouteContext = { params: Promise<{ challengeId: string }> };

const bodySchema = z.object({
  language: z.string().min(1),
  code: z.string().min(1),
});

// Basic per-user rate limit in global scope
declare global {
  var lastSubmissionTimes: Map<string, number> | undefined;
}
if (!global.lastSubmissionTimes) {
  global.lastSubmissionTimes = new Map<string, number>();
}

export async function POST(request: Request, context: RouteContext) {
  const { session, error } = await requireSession();
  if (error) return error;

  const userId = session!.user.id;

  // Rate Limiting Check: 3 seconds cooldown
  const now = Date.now();
  const lastTime = global.lastSubmissionTimes!.get(userId) ?? 0;
  if (now - lastTime < 3000) {
    return NextResponse.json(
      { error: "Too many submissions. Please wait 3 seconds between attempts." },
      { status: 429 }
    );
  }
  global.lastSubmissionTimes!.set(userId, now);

  const { challengeId } = await context.params;
  if (!Types.ObjectId.isValid(challengeId)) {
    return NextResponse.json({ error: "Invalid challenge id" }, { status: 400 });
  }

  // Check request size
  const contentLength = request.headers.get("content-length");
  if (contentLength && parseInt(contentLength) > 100000) {
    return NextResponse.json({ error: "Request body too large" }, { status: 413 });
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

  const { language, code } = parsed.data;

  // Validate Code Length
  if (code.length > 50000) {
    return NextResponse.json({ error: "Code too large" }, { status: 413 });
  }

  // Validate Language Registry
  const langConfig = getLanguageConfig(language);
  if (!langConfig || !langConfig.supported) {
    return NextResponse.json(
      { error: `Language "${language}" is not supported by this runner.` },
      { status: 400 }
    );
  }

  await withDb();
  const id = new Types.ObjectId(challengeId);

  const challenge = await CodingChallenge.findById(id).lean().exec();
  if (!challenge) {
    return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
  }

  // Validate skill ownership
  const skill = await Skill.findOne({ _id: challenge.skillId, userId }).lean().exec();
  if (!skill) {
    return NextResponse.json({ error: "Challenge not found or unauthorized" }, { status: 404 });
  }

  if (challenge.status !== "ready" || !(challenge.testCases?.length)) {
    return NextResponse.json(
      { error: "Challenge is not ready yet" },
      { status: 409 },
    );
  }

  const cases = (challenge.testCases ?? []).map((t) => ({
    input: t.input ?? "",
    expectedOutput: t.expectedOutput ?? "",
    hidden: Boolean(t.hidden),
  }));

  try {
    console.log(`Executing submission: challenge ${challengeId}, user ${userId}, language ${language}`);

    const results = await runAgainstTestCases({
      language,
      code,
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

    const passedCount = mapped.filter((r) => r.passed).length;
    const totalCount = mapped.length;
    const score = totalCount === 0 ? 0 : Math.round((passedCount / totalCount) * 100);
    const allPassed = passedCount === totalCount;

    // Formulate final status code
    let status = "accepted";
    if (!allPassed) {
      const firstFailed = mapped.find((r) => !r.passed);
      if (firstFailed) {
        const output = firstFailed.actual.toLowerCase();
        if (output.includes("compile") || output.includes("syntaxerror")) {
          status = "compile-error";
        } else if (output.includes("error") || output.includes("exception") || output.includes("traceback")) {
          status = "runtime-error";
        } else {
          status = "wrong-answer";
        }
      } else {
        status = "wrong-answer";
      }
    }

    // Save submission to MongoDB
    const submission = await Submission.create({
      userId: new Types.ObjectId(userId),
      challengeId: id,
      language,
      code,
      testResults: mapped.map(({ input, expected, actual, passed: p }) => ({
        input,
        expected,
        actual,
        passed: p,
      })),
      allPassed,
      score,
    });

    // Format safe response (redacting hidden inputs/outputs)
    const publicResults = mapped.map((r) => {
      if (r.hidden) {
        return {
          input: "(hidden)",
          expected: "(hidden)",
          actual: r.passed ? "(hidden)" : r.actual,
          passed: r.passed,
          hidden: true,
        };
      }
      return {
        input: r.input,
        expected: r.expected,
        actual: r.actual,
        passed: r.passed,
        hidden: false,
      };
    });

    return NextResponse.json({
      status,
      passedCount,
      totalCount,
      score,
      allPassed,
      results: publicResults,
      submissionId: submission._id.toString(),
    });

  } catch (err) {
    console.error(`Coding challenge submit API execution failed for user ${userId}:`, err);

    let status = "runtime-error";
    let message = "Code execution failed";
    let httpStatus = 502;

    if (err instanceof PistonUnsupportedLanguageError) {
      status = "unsupported-language";
      message = err.message;
      httpStatus = 400;
    } else if (err instanceof PistonExecutionTimeoutError) {
      status = "timeout";
      message = err.message;
      httpStatus = 408;
    } else if (err instanceof PistonApiError) {
      status = "runtime-error";
      message = "Execution runner is currently offline or misconfigured.";
      httpStatus = 503;
    }

    return NextResponse.json(
      {
        status,
        passedCount: 0,
        totalCount: cases.length,
        score: 0,
        allPassed: false,
        results: [],
        error: message,
      },
      { status: httpStatus }
    );
  }
}
