import { NextResponse } from "next/server";
import { z } from "zod";

import { requireSession, withDb } from "@/lib/api";
import { generateValidatedJson } from "@/lib/gemini/client";
import { Skill } from "@/models/Skill";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const aiSuggestionSchema = z.object({
  suggestions: z
    .array(
      z.object({
        name: z.string().min(1).describe("Skill name"),
        category: z
          .enum(["Next Step", "Complementary", "Trending"])
          .describe("Suggestion category"),
        reason: z
          .string()
          .min(1)
          .describe("Short 1-sentence reason why the user should learn this skill"),
      }),
    )
    .min(3)
    .max(6),
});

export type SkillSuggestionItem = z.infer<
  typeof aiSuggestionSchema
>["suggestions"][number];

export type SkillSuggestionsResponse = {
  suggestions: SkillSuggestionItem[];
  isAiGenerated: boolean;
};

const DEFAULT_FALLBACK_SUGGESTIONS: SkillSuggestionItem[] = [
  {
    name: "System Design & Architecture",
    category: "Next Step",
    reason: "Essential for scaling high-performance web applications and passing senior technical interviews.",
  },
  {
    name: "TypeScript",
    category: "Complementary",
    reason: "Adds static type safety and prevents common runtime errors across frontend and backend code bases.",
  },
  {
    name: "Docker & Containerization",
    category: "Trending",
    reason: "Standardizes production environments and makes microservice deployment predictable.",
  },
  {
    name: "GraphQL & Modern APIs",
    category: "Complementary",
    reason: "Allows flexible data querying and eliminates over-fetching in complex client applications.",
  },
];

export async function GET() {
  const { error } = await requireSession();
  if (error) return error;

  await withDb();

  const activeSkills = await Skill.find({ status: "active" })
    .select("name")
    .lean()
    .exec();

  const activeNames = activeSkills.map((s) => s.name);
  const activeSet = new Set(activeNames.map((n) => n.toLowerCase().trim()));

  const prompt = [
    "You are Pathway's AI skill recommendation advisor.",
    `The user is currently learning the following skills: ${JSON.stringify(activeNames)}.`,
    "Suggest 4 to 6 new skills for the user to learn next.",
    'Categorize each suggestion as "Next Step", "Complementary", or "Trending".',
    "Provide a practical 1-sentence reason for each suggestion.",
    `IMPORTANT: Do NOT suggest skills that the user is already learning (${JSON.stringify(activeNames)}).`,
  ].join("\n");

  try {
    const aiResult = await generateValidatedJson({
      prompt,
      schema: aiSuggestionSchema,
    });

    const filtered = aiResult.data.suggestions.filter(
      (s) => !activeSet.has(s.name.toLowerCase().trim()),
    );

    return NextResponse.json({
      suggestions: filtered.length > 0 ? filtered : DEFAULT_FALLBACK_SUGGESTIONS.filter((s) => !activeSet.has(s.name.toLowerCase().trim())),
      isAiGenerated: true,
    });
  } catch (err) {
    console.warn("AI Skill Suggestions fallback triggered:", err instanceof Error ? err.message : String(err));
    const fallbackFiltered = DEFAULT_FALLBACK_SUGGESTIONS.filter(
      (s) => !activeSet.has(s.name.toLowerCase().trim()),
    );
    return NextResponse.json({
      suggestions: fallbackFiltered,
      isAiGenerated: false,
    });
  }
}
