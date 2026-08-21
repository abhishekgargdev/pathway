import type { LanguageConfig } from "./types";

export const LANGUAGE_REGISTRY: Record<string, LanguageConfig> = {
  javascript: {
    id: "javascript",
    displayName: "JavaScript",
    monacoLanguage: "javascript",
    executionMode: "browser",
    starterCode: `// Enter your solution here\nfunction solve(input) {\n  console.log("Hello from JavaScript!");\n  return input;\n}\n\n// Read from stdin\nconst readline = require("readline");\nconst rl = readline.createInterface({ input: process.stdin });\nrl.on("line", (line) => {\n  console.log(solve(line));\n});\n`,
    supported: true,
  },
  typescript: {
    id: "typescript",
    displayName: "TypeScript",
    monacoLanguage: "typescript",
    executionMode: "browser",
    starterCode: `// Enter your solution here\nfunction solve(input: string): string {\n  console.log("Hello from TypeScript!");\n  return input;\n}\n\n// Read from stdin\nconst readline = require("readline");\nconst rl = readline.createInterface({ input: process.stdin });\nrl.on("line", (line: string) => {\n  console.log(solve(line));\n});\n`,
    supported: true,
  },
  python: {
    id: "python",
    displayName: "Python 3",
    monacoLanguage: "python",
    executionMode: "browser",
    starterCode: `# Enter your solution here\nimport sys\n\ndef solve(input_val):\n    print("Hello from Python!")\n    return input_val\n\nfor line in sys.stdin:\n    print(solve(line.strip()))\n`,
    supported: true,
  },
};

export function getLanguageConfig(languageId: string): LanguageConfig | null {
  const norm = languageId.toLowerCase().trim();
  if (norm === "js") return LANGUAGE_REGISTRY.javascript;
  if (norm === "ts") return LANGUAGE_REGISTRY.typescript;
  if (norm === "py" || norm === "python3") return LANGUAGE_REGISTRY.python;

  return LANGUAGE_REGISTRY[norm] ?? null;
}

export function getSupportedLanguages(): LanguageConfig[] {
  return Object.values(LANGUAGE_REGISTRY).filter((lang) => lang.supported);
}
