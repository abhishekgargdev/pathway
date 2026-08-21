import { Schema, models, model, type Model, type Types } from "mongoose";

export interface IQuizAttempt {
  subtopicId: Types.ObjectId;
  answers?: number[];
  score?: number;
  passed?: boolean;
  attemptedAt: Date;
}

const QuizAttemptSchema = new Schema<IQuizAttempt>({
  subtopicId: {
    type: Schema.Types.ObjectId,
    ref: "Subtopic",
    required: true,
  },
  answers: { type: [Number] },
  score: { type: Number },
  passed: { type: Boolean },
  attemptedAt: { type: Date, default: Date.now },
});

export const QuizAttempt: Model<IQuizAttempt> =
  models.QuizAttempt || model<IQuizAttempt>("QuizAttempt", QuizAttemptSchema);
