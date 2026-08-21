import { Schema, models, model, type Model, type Types } from "mongoose";

export interface IQuizQuestion {
  subtopicId: Types.ObjectId;
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation?: string;
}

const QuizQuestionSchema = new Schema<IQuizQuestion>({
  subtopicId: {
    type: Schema.Types.ObjectId,
    ref: "Subtopic",
    required: true,
  },
  question: { type: String, required: true },
  options: { type: [String], required: true },
  correctAnswerIndex: { type: Number, required: true },
  explanation: { type: String },
});

export const QuizQuestion: Model<IQuizQuestion> =
  models.QuizQuestion ||
  model<IQuizQuestion>("QuizQuestion", QuizQuestionSchema);
