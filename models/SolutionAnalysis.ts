import { Schema, models, model, type Model, type Types } from "mongoose";

export interface IYourSolution {
  timeComplexity?: string;
  spaceComplexity?: string;
  reasoning?: string;
  feedback?: string;
}

export interface IAlternativeSolution {
  code?: string;
  language?: string;
  conceptsUsed?: string[];
  dsaConcepts?: string[];
  timeComplexity?: string;
  spaceComplexity?: string;
  reasoning?: string;
}

export interface ISolutionAnalysis {
  challengeId: Types.ObjectId;
  yourSolution?: IYourSolution;
  alternatives: IAlternativeSolution[];
  generatedAt: Date;
}

const YourSolutionSchema = new Schema<IYourSolution>(
  {
    timeComplexity: { type: String },
    spaceComplexity: { type: String },
    reasoning: { type: String },
    feedback: { type: String },
  },
  { _id: false },
);

const AlternativeSolutionSchema = new Schema<IAlternativeSolution>(
  {
    code: { type: String },
    language: { type: String },
    conceptsUsed: { type: [String] },
    dsaConcepts: { type: [String] },
    timeComplexity: { type: String },
    spaceComplexity: { type: String },
    reasoning: { type: String },
  },
  { _id: false },
);

const SolutionAnalysisSchema = new Schema<ISolutionAnalysis>({
  challengeId: {
    type: Schema.Types.ObjectId,
    ref: "CodingChallenge",
    required: true,
    unique: true,
  },
  yourSolution: { type: YourSolutionSchema },
  alternatives: {
    type: [AlternativeSolutionSchema],
    validate: {
      validator: (value: IAlternativeSolution[]) => value.length === 5,
      message: "alternatives must contain exactly 5 entries",
    },
  },
  generatedAt: { type: Date, default: Date.now },
});

export const SolutionAnalysis: Model<ISolutionAnalysis> =
  models.SolutionAnalysis ||
  model<ISolutionAnalysis>("SolutionAnalysis", SolutionAnalysisSchema);
