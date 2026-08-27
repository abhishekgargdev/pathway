import { z } from "zod";

/** Topic + nested subtopic outline returned when a skill is created. */
export const skillOutlineSchema = z.object({
  description: z
    .string()
    .describe("One or two sentence description of the skill"),
  topics: z
    .array(
      z.object({
        title: z.string().min(1).describe("Topic title"),
        order: z.number().int().positive().describe("1-based topic order"),
        subtopics: z
          .array(
            z.object({
              title: z.string().min(1).describe("Subtopic title"),
              order: z
                .number()
                .int()
                .positive()
                .describe("1-based subtopic order within the topic"),
            }),
          )
          .min(1)
          .describe("Ordered subtopics for this topic"),
      }),
    )
    .min(1)
    .describe("Ordered list of topics that form the learning path"),
});

export type SkillOutline = z.infer<typeof skillOutlineSchema>;

/** Markdown lesson body + code examples for a subtopic. */
export const subtopicContentSchema = z.object({
  body: z
    .string()
    .min(1)
    .describe("Full lesson content in markdown"),
  examples: z
    .array(
      z.object({
        title: z.string().min(1).describe("Short example title"),
        explanation: z
          .string()
          .min(1)
          .describe("What the example demonstrates"),
        code: z.string().min(1).describe("Example source code"),
        language: z
          .string()
          .min(1)
          .describe("Language id for highlighting, e.g. javascript, python"),
      }),
    )
    .describe("Worked code examples accompanying the lesson"),
});

export type SubtopicContent = z.infer<typeof subtopicContentSchema>;

const quizQuestionSchema = z
  .object({
    question: z.string().min(1).describe("Quiz question text"),
    options: z
      .array(z.string().min(1))
      .min(2)
      .max(6)
      .describe("Answer choices"),
    correctAnswerIndex: z
      .number()
      .int()
      .nonnegative()
      .describe("0-based index of the correct option"),
    explanation: z
      .string()
      .min(1)
      .describe("Why the correct answer is right"),
  })
  .refine((q) => q.correctAnswerIndex < q.options.length, {
    message: "correctAnswerIndex must be within options bounds",
    path: ["correctAnswerIndex"],
  });

export const quizQuestionsSchema = z.object({
  questions: z
    .array(quizQuestionSchema)
    .min(1)
    .describe("Quiz questions for the subtopic"),
});

export type QuizQuestions = z.infer<typeof quizQuestionsSchema>;

/** Coding challenge prompt, constraints, and test cases. */
export const codingChallengeSchema = z.object({
  prompt: z
    .string()
    .min(1)
    .describe("Problem statement the learner must solve"),
  difficulty: z
    .enum(["easy", "medium", "hard"])
    .describe("Challenge difficulty"),
  constraints: z
    .array(z.string().min(1))
    .describe("Input/output constraints and limits"),
  testCases: z
    .array(
      z.object({
        input: z.string().describe("stdin / function input as a string"),
        expectedOutput: z
          .string()
          .describe("Expected stdout / return value as a string"),
        hidden: z
          .boolean()
          .describe("true = hidden from learner until after submit"),
      }),
    )
    .min(1)
    .describe("Visible and hidden test cases"),
});

export type CodingChallengePayload = z.infer<typeof codingChallengeSchema>;

const alternativeSolutionSchema = z.object({
  code: z.string().min(1).describe("Full alternative solution source"),
  language: z.string().min(1).describe("Language of the alternative"),
  conceptsUsed: z
    .array(z.string().min(1))
    .describe("General programming concepts used"),
  dsaConcepts: z
    .array(z.string().min(1))
    .describe("DSA concepts used (e.g. two pointers, hash map)"),
  timeComplexity: z.string().min(1).describe("Big-O time complexity"),
  spaceComplexity: z.string().min(1).describe("Big-O space complexity"),
  reasoning: z
    .string()
    .min(1)
    .describe("Why this approach works and when to use it"),
});

/** Post-pass solution analysis: your solution + exactly 5 alternatives. */
export const solutionAnalysisSchema = z.object({
  yourSolution: z.object({
    timeComplexity: z.string().min(1).describe("Big-O time of the submission"),
    spaceComplexity: z
      .string()
      .min(1)
      .describe("Big-O space of the submission"),
    reasoning: z
      .string()
      .min(1)
      .describe("How the submitted solution works"),
    feedback: z
      .string()
      .min(1)
      .describe("Constructive feedback on the submission"),
  }),
  alternatives: z
    .array(alternativeSolutionSchema)
    .length(5)
    .describe("Exactly five alternative approaches"),
});

export type SolutionAnalysisPayload = z.infer<typeof solutionAnalysisSchema>;

/** Simplified re-explanation after repeated quiz failure. */
export const simplifiedExplanationSchema = z.object({
  explanation: z
    .string()
    .min(1)
    .describe("Plain-language simplified explanation of the subtopic"),
});

export type SimplifiedExplanation = z.infer<typeof simplifiedExplanationSchema>;
