import { Schema, models, model, type Model, type Types } from "mongoose";

export type SubtopicStatus = "pending" | "generating" | "ready";

export interface ISubtopic {
  topicId: Types.ObjectId;
  title: string;
  order: number;
  status: SubtopicStatus;
  createdAt: Date;
}

const SubtopicSchema = new Schema<ISubtopic>({
  topicId: {
    type: Schema.Types.ObjectId,
    ref: "Topic",
    required: true,
  },
  title: { type: String, required: true },
  order: { type: Number, required: true },
  status: {
    type: String,
    enum: ["pending", "generating", "ready"],
    default: "pending",
  },
  createdAt: { type: Date, default: Date.now },
});

export const Subtopic: Model<ISubtopic> =
  models.Subtopic || model<ISubtopic>("Subtopic", SubtopicSchema);
