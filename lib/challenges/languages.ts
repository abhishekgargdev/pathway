export const CHALLENGE_LANGUAGES = [
  { id: "python", label: "Python", monaco: "python", ext: ".py" },
  { id: "javascript", label: "JavaScript", monaco: "javascript", ext: ".js" },
  { id: "typescript", label: "TypeScript", monaco: "typescript", ext: ".ts" },
  { id: "go", label: "Go", monaco: "go", ext: ".go" },
] as const;

export type ChallengeLanguageId = (typeof CHALLENGE_LANGUAGES)[number]["id"];

export const DEFAULT_STARTERS: Record<ChallengeLanguageId, string> = {
  python: `# Read from stdin and write the answer to stdout\n\ndef solve():\n    # Your solution here\n    pass\n\nif __name__ == "__main__":\n    solve()\n`,
  javascript: `// Read from stdin and write the answer to stdout\nconst fs = require("fs");\nconst input = fs.readFileSync(0, "utf8").trim();\n\nfunction solve(raw) {\n  // Your solution here\n  return raw;\n}\n\nprocess.stdout.write(String(solve(input)));\n`,
  typescript: `// Read from stdin and write the answer to stdout\nimport * as fs from "fs";\n\nconst input = fs.readFileSync(0, "utf8").trim();\n\nfunction solve(raw: string): string {\n  // Your solution here\n  return raw;\n}\n\nprocess.stdout.write(String(solve(input)));\n`,
  go: `package main\n\nimport (\n\t"bufio"\n\t"fmt"\n\t"os"\n)\n\nfunc main() {\n\treader := bufio.NewReader(os.Stdin)\n\t// Your solution here\n\tfmt.Print("")\n\t_ = reader\n}\n`,
};

export function languageMeta(id: string) {
  return (
    CHALLENGE_LANGUAGES.find((l) => l.id === id) ?? CHALLENGE_LANGUAGES[0]
  );
}
