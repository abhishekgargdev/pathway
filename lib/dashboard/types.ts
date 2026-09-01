export type DashboardContinueTarget = {
  subtopicId: string;
  subtopicTitle: string;
  topicId: string;
  topicTitle: string;
  skillId: string;
  skillName: string;
  percentComplete: number;
  completedSubtopics: number;
  totalSubtopics: number;
};

export type DashboardSkill = {
  id: string;
  name: string;
  description?: string | null;
  percentComplete: number;
  completedSubtopics: number;
  totalSubtopics: number;
  isNew: boolean;
};

export type DashboardResponse = {
  greeting: {
    dateLabel: string;
    hello: string;
    name: string;
  };
  streak: {
    days: number;
    last7Days: boolean[];
  };
  continue: DashboardContinueTarget | null;
  skills: DashboardSkill[];
};
