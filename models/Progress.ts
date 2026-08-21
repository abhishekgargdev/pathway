import { Schema, models, model, type Model, type Types } from "mongoose";

export type ProgressStatus = "not-started" | "in-progress" | "completed";

export interface IProgress {
  skillId: Types.ObjectId;
  topicId?: Types.ObjectId;
  subtopicId?: Types.ObjectId;
  status: ProgressStatus;
  lastVisitedAt?: Date;
}

const ProgressSchema = new Schema<IProgress>({
  skillId: {
    type: Schema.Types.ObjectId,
    ref: "Skill",
    required: true,
  },
  topicId: {
    type: Schema.Types.ObjectId,
    ref: "Topic",
  },
  subtopicId: {
    type: Schema.Types.ObjectId,
    ref: "Subtopic",
  },
  status: {
    type: String,
    enum: ["not-started", "in-progress", "completed"],
    default: "not-started",
  },
  lastVisitedAt: { type: Date },
});

export const Progress: Model<IProgress> =
  models.Progress || model<IProgress>("Progress", ProgressSchema);
