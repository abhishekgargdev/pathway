export type CreateSkillResponse = {
  skill: {
    id: string;
    name: string;
    description: string;
    status: string;
    source: string;
  };
  outline: {
    description: string;
    topics: Array<{
      id: string;
      title: string;
      order: number;
      subtopics: Array<{
        id: string;
        title: string;
        order: number;
      }>;
    }>;
  };
  enqueued: number;
};
