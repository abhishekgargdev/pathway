import { Schema, models, model, type Model, type Types } from "mongoose";

export type SkillStatus = "active" | "archived";
export type SkillSource = "user-added" | "ai-suggested";

export interface ISkill {
  userId: Types.ObjectId;
  name: string;
  description?: string;
  status: SkillStatus;
  source: SkillSource;
  createdAt: Date;
}

const SkillSchema = new Schema<ISkill>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
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
  createdAt: { type: Date, default: Date.now },
});

// Add index for efficient user skill lookup and duplication checks
SkillSchema.index({ userId: 1 });

export const Skill: Model<ISkill> =
  models.Skill || model<ISkill>("Skill", SkillSchema);

