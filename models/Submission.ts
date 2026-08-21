import { Schema, models, model, type Model, type Types } from "mongoose";

export interface ITestResult {
  input?: string;
  expected?: string;
  actual?: string;
  passed?: boolean;
}

export interface ISubmission {
  challengeId: Types.ObjectId;
  language: string;
  code: string;
  testResults?: ITestResult[];
  allPassed: boolean;
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
  challengeId: {
    type: Schema.Types.ObjectId,
    ref: "CodingChallenge",
    required: true,
  },
  language: { type: String, required: true },
  code: { type: String, required: true },
  testResults: { type: [TestResultSchema] },
  allPassed: { type: Boolean, default: false },
  submittedAt: { type: Date, default: Date.now },
});

export const Submission: Model<ISubmission> =
  models.Submission || model<ISubmission>("Submission", SubmissionSchema);
