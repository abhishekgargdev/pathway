import { Schema, models, model, type Model, type Types } from "mongoose";

export type TopicStatus = "pending" | "generating" | "ready";

export interface ITopic {
  skillId: Types.ObjectId;
  title: string;
  order: number;
  status: TopicStatus;
  createdAt: Date;
}

const TopicSchema = new Schema<ITopic>({
  skillId: {
    type: Schema.Types.ObjectId,
    ref: "Skill",
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

export const Topic: Model<ITopic> =
  models.Topic || model<ITopic>("Topic", TopicSchema);
