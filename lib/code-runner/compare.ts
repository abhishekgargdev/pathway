
export interface ComparisonOptions {
  method?: "exact" | "token";
  ignoreCase?: boolean;
}

export function normalizeOutput(value: string): string {
  if (!value) return "";
  
  // 1. Normalize CRLF -> LF
  let result = value.replace(/\r\n/g, "\n");
  
  // 2. Remove trailing whitespace per line
  const lines = result.split("\n").map((line) => line.trimEnd());
  
  // 3. Trim final newlines at the end of the text
  result = lines.join("\n").replace(/\n+$/, "");
  
  return result;
}

export function tokenCompare(actual: string, expected: string, ignoreCase = false): boolean {
  const tokenize = (str: string) => {
    const raw = str.trim().split(/\s+/).filter(Boolean);
    return ignoreCase ? raw.map((t) => t.toLowerCase()) : raw;
  };
  
  const actualTokens = tokenize(actual);
  const expectedTokens = tokenize(expected);
  
  if (actualTokens.length !== expectedTokens.length) return false;
  return actualTokens.every((tok, idx) => tok === expectedTokens[idx]);
}

export function compareOutputs(
  actual: string,
  expected: string,
  options: ComparisonOptions = {},
): boolean {
  const method = options.method ?? "exact";
  const ignoreCase = options.ignoreCase ?? false;

  const normActual = normalizeOutput(actual);
  const normExpected = normalizeOutput(expected);

  if (method === "token") {
    return tokenCompare(normActual, normExpected, ignoreCase);
  }

  // Exact comparison (default)
  const finalActual = ignoreCase ? normActual.toLowerCase() : normActual;
  const finalExpected = ignoreCase ? normExpected.toLowerCase() : normExpected;

  return finalActual === finalExpected;
}
