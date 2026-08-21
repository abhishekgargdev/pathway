/**
 * Piston code-execution client.
 * Public API does not batch multiple stdin cases in one request — we run per test case.
 * Base URL from PISTON_API_URL (e.g. https://emkc.org/api/v2/piston).
 */

export type PistonTestCase = {
  input: string;
  expectedOutput: string;
};

export type PistonTestResult = {
  input: string;
  expected: string;
  actual: string;
  passed: boolean;
};

export type RunAgainstTestCasesParams = {
  language: string;
  code: string;
  testCases: PistonTestCase[];
};

type PistonRuntime = {
  language: string;
  version: string;
  aliases: string[];
  runtime?: string;
};

type PistonStageResult = {
  stdout?: string;
  stderr?: string;
  output?: string;
  code?: number | null;
  signal?: string | null;
  message?: string;
  status?: string | null;
  cpu_time?: number | null;
  wall_time?: number | null;
};

type PistonExecuteResponse = {
  language?: string;
  version?: string;
  compile?: PistonStageResult;
  run?: PistonStageResult;
  message?: string;
};

export class PistonUnsupportedLanguageError extends Error {
  readonly name = "PistonUnsupportedLanguageError";

  constructor(
    readonly language: string,
    message?: string,
  ) {
    super(
      message ??
        `Language "${language}" is not supported by the code runner. Try a common language like javascript, python, or typescript.`,
    );
  }
}

export class PistonExecutionTimeoutError extends Error {
  readonly name = "PistonExecutionTimeoutError";

  constructor(
    message = "Code execution timed out. Simplify your solution or avoid infinite loops.",
  ) {
    super(message);
  }
}

export class PistonApiError extends Error {
  readonly name = "PistonApiError";

  constructor(
    message: string,
    readonly statusCode?: number,
  ) {
    super(message);
  }
}

declare global {
  // eslint-disable-next-line no-var
  var pistonRuntimesCache:
    | { fetchedAt: number; runtimes: PistonRuntime[] }
    | undefined;
}

const RUNTIMES_TTL_MS = 60 * 60 * 1000;
const DEFAULT_RUN_TIMEOUT_MS = 10_000;
const DEFAULT_COMPILE_TIMEOUT_MS = 10_000;

function getBaseUrl(): string {
  const raw = process.env.PISTON_API_URL?.trim();
  if (!raw) {
    throw new PistonApiError(
      "PISTON_API_URL is not configured. Set it in your environment (e.g. https://emkc.org/api/v2/piston).",
    );
  }
  return raw.replace(/\/+$/, "");
}

function compareSemverDesc(a: string, b: string): number {
  return b.localeCompare(a, undefined, { numeric: true, sensitivity: "base" });
}

function normalizeOutput(value: string): string {
  return value.replace(/\r\n/g, "\n").replace(/\s+$/u, "");
}

function stageLooksTimedOut(stage: PistonStageResult | undefined): boolean {
  if (!stage) return false;
  if (stage.signal === "SIGKILL" || stage.signal === "SIGXCPU") return true;
  const blob = `${stage.stderr ?? ""} ${stage.message ?? ""} ${stage.status ?? ""}`;
  return /time(?:d)?\s*out|wall.?time|cpu.?time|killed|SIGXCPU|SIGKILL/i.test(
    blob,
  );
}

function combineActual(stage: PistonStageResult | undefined): string {
  if (!stage) return "";
  if (stage.output?.length) return stage.output;
  const stdout = stage.stdout ?? "";
  const stderr = stage.stderr ?? "";
  if (stdout && stderr) return `${stdout}${stderr.endsWith("\n") ? "" : "\n"}${stderr}`;
  return stdout || stderr;
}

async function fetchRuntimes(force = false): Promise<PistonRuntime[]> {
  const cached = global.pistonRuntimesCache;
  if (
    !force &&
    cached &&
    Date.now() - cached.fetchedAt < RUNTIMES_TTL_MS &&
    cached.runtimes.length > 0
  ) {
    return cached.runtimes;
  }

  const url = `${getBaseUrl()}/runtimes`;
  let response: Response;
  try {
    response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new PistonApiError(`Failed to reach Piston runtimes endpoint: ${message}`);
  }

  if (!response.ok) {
    throw new PistonApiError(
      `Piston runtimes request failed (${response.status})`,
      response.status,
    );
  }

  const runtimes = (await response.json()) as PistonRuntime[];
  global.pistonRuntimesCache = { fetchedAt: Date.now(), runtimes };
  return runtimes;
}

/**
 * Resolve a user-facing language string to a concrete Piston language + version.
 * When multiple versions exist, picks the highest SemVer (e.g. node JS over older Deno JS).
 */
export async function resolvePistonRuntime(language: string): Promise<{
  language: string;
  version: string;
}> {
  const needle = language.trim().toLowerCase();
  if (!needle) {
    throw new PistonUnsupportedLanguageError(
      language,
      "A programming language is required.",
    );
  }

  const runtimes = await fetchRuntimes();
  const matches = runtimes.filter((runtime) => {
    if (runtime.language.toLowerCase() === needle) return true;
    return runtime.aliases.some((alias) => alias.toLowerCase() === needle);
  });

  if (matches.length === 0) {
    throw new PistonUnsupportedLanguageError(language);
  }

  matches.sort((a, b) => compareSemverDesc(a.version, b.version));
  const best = matches[0]!;
  return { language: best.language, version: best.version };
}

async function executeOnce(params: {
  language: string;
  version: string;
  code: string;
  stdin: string;
}): Promise<PistonExecuteResponse> {
  const url = `${getBaseUrl()}/execute`;
  let response: Response;

  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        language: params.language,
        version: params.version,
        files: [{ content: params.code }],
        stdin: params.stdin,
        compile_timeout: DEFAULT_COMPILE_TIMEOUT_MS,
        run_timeout: DEFAULT_RUN_TIMEOUT_MS,
      }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new PistonApiError(`Failed to reach Piston execute endpoint: ${message}`);
  }

  const text = await response.text();
  let body: PistonExecuteResponse | { message?: string } = {};
  try {
    body = text ? (JSON.parse(text) as PistonExecuteResponse) : {};
  } catch {
    throw new PistonApiError(
      `Piston returned a non-JSON response (${response.status})`,
      response.status,
    );
  }

  if (!response.ok) {
    const message =
      ("message" in body && typeof body.message === "string" && body.message) ||
      `Piston execute failed (${response.status})`;

    if (/language|runtime|not (found|supported)|unknown/i.test(message)) {
      throw new PistonUnsupportedLanguageError(params.language, message);
    }

    if (/time(?:d)?\s*out/i.test(message)) {
      throw new PistonExecutionTimeoutError(message);
    }

    throw new PistonApiError(message, response.status);
  }

  return body as PistonExecuteResponse;
}

function assertNoTimeout(response: PistonExecuteResponse): void {
  if (
    stageLooksTimedOut(response.compile) ||
    stageLooksTimedOut(response.run)
  ) {
    throw new PistonExecutionTimeoutError();
  }
}

/**
 * Runs `code` against each test case via Piston (one execute call per case).
 * Returns normalized `{ input, expected, actual, passed }` results.
 *
 * Throws:
 * - PistonUnsupportedLanguageError
 * - PistonExecutionTimeoutError
 * - PistonApiError
 */
export async function runAgainstTestCases(
  params: RunAgainstTestCasesParams,
): Promise<PistonTestResult[]> {
  if (!params.code.trim()) {
    throw new PistonApiError("Code is required to run test cases.");
  }

  if (!params.testCases.length) {
    throw new PistonApiError("At least one test case is required.");
  }

  const runtime = await resolvePistonRuntime(params.language);
  const results: PistonTestResult[] = [];

  // Sequential on purpose — public Piston rate-limits concurrent execute calls.
  for (const testCase of params.testCases) {
    const response = await executeOnce({
      language: runtime.language,
      version: runtime.version,
      code: params.code,
      stdin: testCase.input ?? "",
    });

    assertNoTimeout(response);

    // Prefer run output; if compile failed with no run, surface compile stderr.
    const actual =
      response.run != null
        ? combineActual(response.run)
        : combineActual(response.compile);

    const expected = testCase.expectedOutput ?? "";
    const exitOk =
      response.run != null &&
      !response.run.signal &&
      (response.run.code === 0 ||
        response.run.code === null ||
        response.run.code === undefined);

    results.push({
      input: testCase.input ?? "",
      expected,
      actual,
      passed: exitOk && normalizeOutput(actual) === normalizeOutput(expected),
    });
  }

  return results;
}

/** Convenience: whether every returned test passed. */
export function allTestsPassed(results: PistonTestResult[]): boolean {
  return results.length > 0 && results.every((r) => r.passed);
}
