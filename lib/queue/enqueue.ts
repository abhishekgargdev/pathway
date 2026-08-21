import type { Types } from "mongoose";

import { connectDB } from "@/lib/db/connect";
import {
  GenerationQueue,
  type GenerationTargetType,
  type IGenerationQueue,
} from "@/models/GenerationQueue";

export type EnqueueParams = {
  targetType: GenerationTargetType;
  targetId: Types.ObjectId | string;
  skillId: Types.ObjectId | string;
  priority?: number;
};

/**
 * Push a GenerationQueue row (status queued, attempts 0).
 */
export async function enqueueGeneration(
  params: EnqueueParams,
): Promise<IGenerationQueue & { _id: Types.ObjectId }> {
  await connectDB();

  const doc = await GenerationQueue.create({
    targetType: params.targetType,
    targetId: params.targetId,
    skillId: params.skillId,
    priority: params.priority ?? 0,
    status: "queued",
    attempts: 0,
  });

  return doc.toObject() as IGenerationQueue & { _id: Types.ObjectId };
}

/**
 * Enqueue many rows in one insert (e.g. after skill outline creation).
 */
export async function enqueueGenerationMany(
  items: EnqueueParams[],
): Promise<number> {
  if (items.length === 0) return 0;
  await connectDB();

  const result = await GenerationQueue.insertMany(
    items.map((item) => ({
      targetType: item.targetType,
      targetId: item.targetId,
      skillId: item.skillId,
      priority: item.priority ?? 0,
      status: "queued" as const,
      attempts: 0,
    })),
    { ordered: false },
  );

  return result.length;
}
