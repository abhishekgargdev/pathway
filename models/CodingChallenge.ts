import { Schema, models, model, type Model, type Types } from "mongoose";

export type ChallengeDifficulty = "easy" | "medium" | "hard";
export type ChallengeStatus = "pending" | "generating" | "ready" | "failed";

export interface ITestCase {
  input?: string;
  expectedOutput?: string;
  hidden?: boolean;
}

export interface IReferenceSolution {
  language?: string;
  code?: string;
}

export interface ICodingChallenge {
  skillId: Types.ObjectId;
  topicId?: Types.ObjectId;
  title?: string;
  prompt: string;
  difficulty?: ChallengeDifficulty;
  constraints?: string[];
  inputFormat?: string;
  outputFormat?: string;
  starterCode?: string;
  supportedLanguages?: string[];
  testCases?: ITestCase[];
  referenceSolution?: IReferenceSolution;
  timeLimitMs?: number;
  memoryLimitMb?: number;
  outputLimitBytes?: number;
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

const ReferenceSolutionSchema = new Schema<IReferenceSolution>(
  {
    language: { type: String },
    code: { type: String },
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
  title: { type: String },
  prompt: { type: String, required: true },
  difficulty: {
    type: String,
    enum: ["easy", "medium", "hard"],
  },
  constraints: { type: [String] },
  inputFormat: { type: String },
  outputFormat: { type: String },
  starterCode: { type: String },
  supportedLanguages: { type: [String] },
  testCases: { type: [TestCaseSchema] },
  referenceSolution: { type: ReferenceSolutionSchema },
  timeLimitMs: { type: Number, default: 6000 },
  memoryLimitMb: { type: Number, default: 512 },
  outputLimitBytes: { type: Number, default: 50000 },
  status: {
    type: String,
    enum: ["pending", "generating", "ready", "failed"],
    default: "pending",
  },
  createdAt: { type: Date, default: Date.now },
});

export const CodingChallenge: Model<ICodingChallenge> =
  models.CodingChallenge ||
  model<ICodingChallenge>("CodingChallenge", CodingChallengeSchema);
