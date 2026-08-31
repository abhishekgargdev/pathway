import { Schema, models, model, type Model } from "mongoose";

export type SkillStatus = "active" | "archived";
export type SkillSource = "user-added" | "ai-suggested";

export interface ISkill {
  name: string;
  description?: string;
  status: SkillStatus;
  source: SkillSource;
  generationStatus?: "generating" | "ready" | "failed";
  createdAt: Date;
}

const SkillSchema = new Schema<ISkill>({
  name: { type: String, required: true },
  description: { type: String },
  status: {
    type: String,
    enum: ["active", "archived"],
    default: "active",
  },
  source: {
    type: String,
    enum: ["user-added", "ai-suggested"],
    default: "user-added",
  },
  generationStatus: {
    type: String,
    enum: ["generating", "ready", "failed"],
    default: "generating",
  },
  createdAt: { type: Date, default: Date.now },
});

export const Skill: Model<ISkill> =
  models.Skill || model<ISkill>("Skill", SkillSchema);
