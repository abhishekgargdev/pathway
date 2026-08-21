export type ExecutionStatus =
  | "accepted"
  | "compile-error"
  | "runtime-error"
  | "timeout"
  | "memory-limit"
  | "output-limit"
  | "unsupported";

export interface CodeExecutionRequest {
  language: string;
  code: string;
  stdin?: string;
  timeLimitMs?: number;
  memoryLimitMb?: number;
  outputLimitBytes?: number;
}

export interface CodeExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  executionTimeMs: number;
  status: ExecutionStatus;
}

export interface LanguageConfig {
  id: string;
  displayName: string;
  monacoLanguage: string;
  executionMode: "browser" | "unsupported";
  starterCode: string;
  supported: boolean;
}

export interface TestCase {
  input: string;
  expectedOutput: string;
  hidden?: boolean;
}

export interface TestCaseResult {
  input: string;
  expected: string;
  actual: string;
  passed: boolean;
  hidden?: boolean;
  status: ExecutionStatus;
  executionTimeMs: number;
}

export interface ChallengeExecutionSummary {
  results: TestCaseResult[];
  passedCount: number;
  totalCount: number;
  score: number;
  status: ExecutionStatus;
}
