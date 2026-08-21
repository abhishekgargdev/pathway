import { Schema, models, model, type Model, type Types } from "mongoose";

export type ChallengeDifficulty = "easy" | "medium" | "hard";
export type ChallengeStatus = "pending" | "generating" | "ready";

export interface ITestCase {
  input?: string;
  expectedOutput?: string;
  hidden?: boolean;
}

export interface ICodingChallenge {
  skillId: Types.ObjectId;
  topicId?: Types.ObjectId;
  prompt: string;
  difficulty?: ChallengeDifficulty;
  constraints?: string[];
  testCases?: ITestCase[];
  status: ChallengeStatus;
  createdAt: Date;
}

const TestCaseSchema = new Schema<ITestCase>(
  {
    input: { type: String },
    expectedOutput: { type: String },
    hidden: { type: Boolean },
  },
  { _id: false },
);

const CodingChallengeSchema = new Schema<ICodingChallenge>({
  skillId: {
    type: Schema.Types.ObjectId,
    ref: "Skill",
    required: true,
  },
  topicId: {
    type: Schema.Types.ObjectId,
    ref: "Topic",
  },
  prompt: { type: String, required: true },
  difficulty: {
    type: String,
    enum: ["easy", "medium", "hard"],
  },
  constraints: { type: [String] },
  testCases: { type: [TestCaseSchema] },
  status: {
    type: String,
    enum: ["pending", "generating", "ready"],
    default: "pending",
  },
  createdAt: { type: Date, default: Date.now },
});

export const CodingChallenge: Model<ICodingChallenge> =
  models.CodingChallenge ||
  model<ICodingChallenge>("CodingChallenge", CodingChallengeSchema);
