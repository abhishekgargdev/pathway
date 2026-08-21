import { Schema, models, model, type Model, type Types } from "mongoose";

export type GenerationTargetType =
  | "topic-outline"
  | "subtopic-content"
  | "quiz"
  | "coding-challenge";

export type GenerationQueueStatus =
  | "queued"
  | "processing"
  | "done"
  | "failed";

export interface IGenerationQueue {
  targetType?: GenerationTargetType;
  targetId?: Types.ObjectId;
  skillId?: Types.ObjectId;
  priority: number;
  status: GenerationQueueStatus;
  attempts: number;
  lastError?: string;
  createdAt: Date;
  /** Set when status becomes done — used for dashboard "new" flags */
  completedAt?: Date;
}

const GenerationQueueSchema = new Schema<IGenerationQueue>({
  targetType: {
    type: String,
    enum: [
      "topic-outline",
      "subtopic-content",
      "quiz",
      "coding-challenge",
    ],
  },
  targetId: { type: Schema.Types.ObjectId },
  skillId: {
    type: Schema.Types.ObjectId,
    ref: "Skill",
  },
  priority: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ["queued", "processing", "done", "failed"],
    default: "queued",
  },
  attempts: { type: Number, default: 0 },
  lastError: { type: String },
  createdAt: { type: Date, default: Date.now },
  completedAt: { type: Date },
});

export const GenerationQueue: Model<IGenerationQueue> =
  models.GenerationQueue ||
  model<IGenerationQueue>("GenerationQueue", GenerationQueueSchema);
