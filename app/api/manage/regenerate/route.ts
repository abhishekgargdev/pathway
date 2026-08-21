import { NextResponse } from "next/server";
import { Types } from "mongoose";

import { requireSession, withDb } from "@/lib/api";
import { CodingChallenge } from "@/models/CodingChallenge";
import { GenerationQueue } from "@/models/GenerationQueue";
import { Subtopic } from "@/models/Subtopic";
import { Topic } from "@/models/Topic";

export async function POST(request: Request) {
  const { error } = await requireSession();
  if (error) return error;

  await withDb();

  let body: { queueItemId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { queueItemId } = body;
  if (!queueItemId || !Types.ObjectId.isValid(queueItemId)) {
    return NextResponse.json(
      { error: "Valid queueItemId is required" },
      { status: 400 },
    );
  }

  const item = await GenerationQueue.findById(queueItemId);
  if (!item) {
    return NextResponse.json(
      { error: "Generation queue item not found" },
      { status: 404 },
    );
  }

  // 1. Reset the target status based on targetType to show 'pending' states in user trees
  if (item.targetId) {
    if (item.targetType === "subtopic-content") {
      await Subtopic.updateOne(
        { _id: item.targetId },
        { $set: { status: "pending" } },
      ).exec();
    } else if (item.targetType === "topic-outline") {
      await Topic.updateOne(
        { _id: item.targetId },
        { $set: { status: "pending" } },
      ).exec();
    } else if (item.targetType === "coding-challenge") {
      await CodingChallenge.updateOne(
        { _id: item.targetId },
        { $set: { status: "pending" } },
      ).exec();
    }
  }

  // 2. Reset the queue item itself
  item.status = "queued";
  item.attempts = 0;
  item.lastError = undefined;
  await item.save();

  return NextResponse.json({
    ok: true,
    item: {
      id: String(item._id),
      status: item.status,
      attempts: item.attempts,
    },
  });
}
