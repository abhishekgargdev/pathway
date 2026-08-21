import { Schema, models, model, type Model } from "mongoose";

export interface IAiUsageLog {
  keyIndex: number;
  date: string;
  callsUsed: number;
  tokensUsed: number;
}

const AiUsageLogSchema = new Schema<IAiUsageLog>({
  keyIndex: { type: Number, required: true, min: 1, max: 6 },
  date: { type: String, required: true },
  callsUsed: { type: Number, default: 0 },
  tokensUsed: { type: Number, default: 0 },
});

AiUsageLogSchema.index({ keyIndex: 1, date: 1 }, { unique: true });

export const AiUsageLog: Model<IAiUsageLog> =
  models.AiUsageLog || model<IAiUsageLog>("AiUsageLog", AiUsageLogSchema);
