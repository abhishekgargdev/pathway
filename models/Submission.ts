import { Schema, models, model, type Model, type Types } from "mongoose";

export interface ITestResult {
  input?: string;
  expected?: string;
  actual?: string;
  passed?: boolean;
}

export interface ISubmission {
  userId: Types.ObjectId;
  challengeId: Types.ObjectId;
  language: string;
  code: string;
  testResults?: ITestResult[];
  allPassed: boolean;
  score?: number;
  submittedAt: Date;
}

const TestResultSchema = new Schema<ITestResult>(
  {
    input: { type: String },
    expected: { type: String },
    actual: { type: String },
    passed: { type: Boolean },
  },
  { _id: false },
);

const SubmissionSchema = new Schema<ISubmission>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  challengeId: {
    type: Schema.Types.ObjectId,
    ref: "CodingChallenge",
    required: true,
    index: true,
  },
  language: { type: String, required: true },
  code: { type: String, required: true },
  testResults: { type: [TestResultSchema] },
  allPassed: { type: Boolean, default: false },
  score: { type: Number, default: 0 },
  submittedAt: { type: Date, default: Date.now },
});

export const Submission: Model<ISubmission> =
  models.Submission || model<ISubmission>("Submission", SubmissionSchema);
