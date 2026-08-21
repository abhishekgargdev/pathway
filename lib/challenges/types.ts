export type ChallengeTestCasePublic = {
  input: string;
  expectedOutput: string;
};

export type ChallengeTestResult = {
  input: string;
  expected: string;
  actual: string;
  passed: boolean;
  hidden?: boolean;
};

export type ChallengeGetResponse = {
  status: "ready" | "ready_tomorrow" | "generating" | "pending" | "error";
  message?: string;
  challenge: {
    id: string;
    skillId: string;
    topicId: string | null;
    skillName: string;
    topicTitle: string | null;
    prompt: string;
    difficulty: "easy" | "medium" | "hard" | null;
    constraints: string[];
    visibleTestCases: ChallengeTestCasePublic[];
    totalTestCount: number;
  } | null;
  latestSubmission: {
    id: string;
    language: string;
    code: string;
    allPassed: boolean;
    submittedAt: string;
    testResults: ChallengeTestResult[];
  } | null;
  hasPassingSubmission: boolean;
  hasAnalysis: boolean;
};

export type ChallengeSubmitResponse = {
  submissionId: string;
  language: string;
  allPassed: boolean;
  testResults: ChallengeTestResult[];
  preview: boolean;
};

export type SolutionAnalysisResponse = {
  status: "ready" | "ready_tomorrow" | "forbidden" | "generating" | "error";
  message?: string;
  skillId?: string;
  analysis: {
    challengeId: string;
    yourSolution: {
      timeComplexity: string;
      spaceComplexity: string;
      reasoning: string;
      feedback: string;
    };
    alternatives: Array<{
      code: string;
      language: string;
      conceptsUsed: string[];
      dsaConcepts: string[];
      timeComplexity: string;
      spaceComplexity: string;
      reasoning: string;
    }>;
    generatedAt: string;
    submission: {
      language: string;
      code: string;
    };
  } | null;
};
