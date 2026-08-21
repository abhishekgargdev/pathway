import { runCodeBrowser } from "./provider";
import { compareOutputs } from "./compare";
import type { TestCase, ChallengeExecutionSummary, TestCaseResult } from "./types";

export * from "./types";
export * from "./languages";
export * from "./compare";
export * from "./provider";

export async function runAgainstTestCasesBrowser(
  code: string,
  language: string,
  testCases: TestCase[],
  options: { timeLimitMs?: number; outputLimitBytes?: number } = {},
): Promise<ChallengeExecutionSummary> {
  const results: TestCaseResult[] = [];
  let passedCount = 0;

  for (const testCase of testCases) {
    const execResult = await runCodeBrowser({
      language,
      code,
      stdin: testCase.input,
      timeLimitMs: options.timeLimitMs,
      outputLimitBytes: options.outputLimitBytes,
    });

    // Determine status & correctness
    const passed =
      execResult.status === "accepted" &&
      compareOutputs(execResult.stdout, testCase.expectedOutput);

    if (passed) {
      passedCount++;
    }

    results.push({
      input: testCase.input,
      expected: testCase.expectedOutput,
      actual: execResult.status === "accepted" ? execResult.stdout : execResult.stderr,
      passed,
      hidden: testCase.hidden,
      status: execResult.status,
      executionTimeMs: execResult.executionTimeMs,
    });
  }

  const score = testCases.length === 0 ? 0 : Math.round((passedCount / testCases.length) * 100);
  const firstFailed = results.find((r) => !r.passed);
  const status = firstFailed ? firstFailed.status : "accepted";

  return {
    results,
    passedCount,
    totalCount: testCases.length,
    score,
    status,
  };
}
