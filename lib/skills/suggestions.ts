/**
 * Curated skill suggestion chips for the Add Skill dialog.
 * Chosen over a second Gemini call to preserve daily quota for outline + content generation.
 */
export const CURATED_SKILL_SUGGESTIONS = [
  "Data Structures & Algorithms",
  "TypeScript",
  "Python",
  "System Design",
  "React",
  "Node.js",
  "SQL & Databases",
  "Machine Learning Fundamentals",
  "Git & Collaboration",
  "CSS & Responsive Layout",
  "Go",
  "Rust",
] as const;

export function getSkillSuggestions(params?: {
  query?: string;
  exclude?: string[];
  limit?: number;
}): string[] {
  const query = params?.query?.trim().toLowerCase() ?? "";
  const exclude = new Set(
    (params?.exclude ?? []).map((name) => name.trim().toLowerCase()),
  );
  const limit = params?.limit ?? 6;

  const filtered = CURATED_SKILL_SUGGESTIONS.filter((name) => {
    if (exclude.has(name.toLowerCase())) return false;
    if (!query) return true;
    return name.toLowerCase().includes(query);
  });

  return filtered.slice(0, limit);
}
