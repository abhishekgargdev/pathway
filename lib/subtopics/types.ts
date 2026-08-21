export type SubtopicContentResponse = {
  status: "ready" | "ready_tomorrow" | "generating" | "error";
  message?: string;
  subtopic: {
    id: string;
    title: string;
    status: string;
  };
  topic: { id: string; title: string };
  skill: { id: string; name: string };
  progressStatus?: "not-started" | "in-progress" | "completed";
  navigation?: {
    prevSubtopicId: string | null;
    prevSubtopicTitle: string | null;
    nextSubtopicId: string | null;
    nextSubtopicTitle: string | null;
  } | null;
  content: {
    body: string;
    examples: Array<{
      title?: string;
      explanation?: string;
      code?: string;
      language?: string;
    }>;
    simplifiedExplanation: string | null;
  } | null;
  quiz: {
    ready: boolean;
    questionCount: number;
    questions: Array<{
      id: string;
      question: string;
      options: string[];
    }>;
  };
};

export type QuizSubmitResponse = {
  score: number;
  percent: number;
  passed: boolean;
  correctCount: number;
  total: number;
  results: Array<{
    questionId: string;
    selectedIndex: number;
    correctAnswerIndex: number;
    correct: boolean;
    explanation: string | null;
  }>;
  consecutiveFails: number;
  simplifiedExplanation: string | null;
  progressStatus: "in-progress" | "completed";
};
