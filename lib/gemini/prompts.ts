/**
 * Prompt templates for Gemini generation.
 * Each instructs the model to return ONLY valid JSON matching the Zod schema shape.
 */

function jsonOnlyPreamble(shapeDescription: string): string {
  return [
    "You are a curriculum generator for Pathway, a single-user AI learning app.",
    "Return ONLY valid JSON. No markdown fences, no commentary, no trailing text.",
    "The JSON must match this shape exactly:",
    shapeDescription,
  ].join("\n");
}

export function skillOutlinePrompt(skillName: string): string {
  const shape = `{
  "description": string — one or two sentence description of the skill,
  "topics": [
    {
      "title": string — topic title,
      "order": number — 1-based order,
      "subtopics": [
        {
          "title": string — subtopic title,
          "order": number — 1-based order within the topic
        }
      ]
    }
  ]
}`;

  return `${jsonOnlyPreamble(shape)}

Generate a practical learning path outline for the skill: "${skillName}".

Rules:
- Produce 4–8 topics in a sensible beginner→advanced order.
- Each topic should have 2–5 focused subtopics.
- Titles should be concise and concrete (no fluff).
- order fields must be sequential starting at 1 within each list.
- description must mention what the learner will be able to do.`;
}

export function subtopicContentPrompt(params: {
  skillName: string;
  topicTitle: string;
  subtopicTitle: string;
}): string {
  const shape = `{
  "body": string — comprehensive lesson formatted in GitHub Flavored Markdown (use ## sections, ### sub-sections, **bold key terms**, bullet points, and inline code),
  "examples": [
    {
      "title": string,
      "explanation": string — clear explanation of the example,
      "code": string — complete runnable code snippet,
      "language": string — e.g. "javascript", "python", "typescript", "java", "bash"
    }
  ]
}`;

  return `${jsonOnlyPreamble(shape)}

Write a high-quality lesson for:
- Skill: "${params.skillName}"
- Topic: "${params.topicTitle}"
- Subtopic: "${params.subtopicTitle}"

Rules:
- Write "body" strictly in Markdown with clear section headers (## Overview, ## Core Concepts, ## Key Takeaways), bullet lists (-), and bold key terms (**term**).
- Include 1–3 practical examples with clean code snippets and step-by-step explanations.
- Ensure all newlines inside JSON string fields are properly escaped as \\n so the JSON parses cleanly.
- Keep content engaging, easy to read, and educational for an eager learner.`;
}

export function quizQuestionsPrompt(params: {
  skillName: string;
  topicTitle: string;
  subtopicTitle: string;
  contentSummary?: string;
}): string {
  const shape = `{
  "questions": [
    {
      "question": string,
      "options": string[] — 2 to 6 choices,
      "correctAnswerIndex": number — 0-based index into options,
      "explanation": string — why the correct option is right
    }
  ]
}`;

  const contentBlock = params.contentSummary
    ? `\nLesson summary for grounding:\n${params.contentSummary}\n`
    : "";

  return `${jsonOnlyPreamble(shape)}

Create a quiz for:
- Skill: "${params.skillName}"
- Topic: "${params.topicTitle}"
- Subtopic: "${params.subtopicTitle}"
${contentBlock}
Rules:
- Produce 3–6 questions that check understanding, not trivia.
- Exactly one correct option per question; correctAnswerIndex must be in range.
- Distractors should be plausible.
- Explanations should teach, not just say "correct".`;
}

export function codingChallengePrompt(params: {
  skillName: string;
  topicTitle: string;
  difficulty?: "easy" | "medium" | "hard";
}): string {
  const shape = `{
  "prompt": string — clear problem statement,
  "difficulty": "easy" | "medium" | "hard",
  "constraints": string[] — limits and I/O rules,
  "testCases": [
    {
      "input": string — stdin / serialized input,
      "expectedOutput": string — expected stdout / result,
      "hidden": boolean — true for hidden tests
    }
  ]
}`;

  const difficultyLine = params.difficulty
    ? `Target difficulty: ${params.difficulty}.`
    : "Choose an appropriate difficulty for the topic.";

  return `${jsonOnlyPreamble(shape)}

Create one coding challenge for:
- Skill: "${params.skillName}"
- Topic: "${params.topicTitle}"
${difficultyLine}

Rules:
- prompt must be self-contained and solvable in a single file.
- Include at least 3 testCases; at least one should have hidden=true.
- expectedOutput must match the described I/O format exactly (trim-sensitive).
- constraints should cover input size / edge cases where relevant.`;
}

export function solutionAnalysisPrompt(params: {
  skillName: string;
  challengePrompt: string;
  language: string;
  code: string;
}): string {
  const shape = `{
  "yourSolution": {
    "timeComplexity": string,
    "spaceComplexity": string,
    "reasoning": string — how the submitted code works,
    "feedback": string — constructive critique and improvements
  },
  "alternatives": [
    {
      "code": string,
      "language": string,
      "conceptsUsed": string[],
      "dsaConcepts": string[],
      "timeComplexity": string,
      "spaceComplexity": string,
      "reasoning": string
    }
  ] — MUST contain exactly 5 objects
}`;

  return `${jsonOnlyPreamble(shape)}

Analyze a passing solution for a coding challenge.

Skill: "${params.skillName}"
Challenge prompt:
${params.challengePrompt}

Submitted language: ${params.language}
Submitted code:
\`\`\`${params.language}
${params.code}
\`\`\`

Rules:
- yourSolution must analyze THIS submission (not a rewrite).
- alternatives MUST be exactly 5 distinct approaches (different ideas or tradeoffs).
- Each alternative needs real code, conceptsUsed, dsaConcepts, complexities, and reasoning.
- Prefer the same language as the submission unless another language better illustrates a concept.`;
}

export function simplifiedExplanationPrompt(params: {
  skillName: string;
  topicTitle: string;
  subtopicTitle: string;
  contentSummary?: string;
}): string {
  const shape = `{
  "explanation": string — a clear, simpler re-teaching of the subtopic in markdown-friendly plain prose
}`;

  const contentBlock = params.contentSummary
    ? `\nOriginal lesson excerpt:\n${params.contentSummary}\n`
    : "";

  return `${jsonOnlyPreamble(shape)}

The learner failed the quiz twice on this subtopic and needs a simpler explanation.

- Skill: "${params.skillName}"
- Topic: "${params.topicTitle}"
- Subtopic: "${params.subtopicTitle}"
${contentBlock}
Rules:
- Use shorter sentences and concrete analogies.
- Avoid jargon, or define it immediately when needed.
- Do not include a quiz or code dump longer than ~15 lines.
- Keep explanation focused on the core idea only.`;
}

export function orderSkillsPrompt(skills: string[]): string {
  const shape = `{
  "skills": string[] — list of ordered skills from foundational to advanced
}`;

  return `${jsonOnlyPreamble(shape)}

Analyze the dependencies, prerequisites, and logical learning hierarchy of these technical skills: ${JSON.stringify(skills)}.
Order them from most foundational to most advanced, so that skills that are prerequisites or form a base for others are learned first.
Return the list strictly in that ordered sequence.`;
}
