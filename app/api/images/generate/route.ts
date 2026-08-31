import { Types } from "mongoose";
import { NextResponse } from "next/server";

import { requireSession, withDb } from "@/lib/api";
import { generateNvidiaImage } from "@/lib/nvidia/client";
import { Content } from "@/models/Content";
import { Subtopic } from "@/models/Subtopic";
import { Topic } from "@/models/Topic";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const { error } = await requireSession();
  if (error) return error;

  let body: { subtopicId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { subtopicId } = body;
  if (!subtopicId || !Types.ObjectId.isValid(subtopicId)) {
    return NextResponse.json({ error: "Invalid subtopicId" }, { status: 400 });
  }

  await withDb();

  const subtopicObjectId = new Types.ObjectId(subtopicId);
  const subtopic = await Subtopic.findById(subtopicObjectId).lean().exec();
  if (!subtopic) {
    return NextResponse.json({ error: "Subtopic not found" }, { status: 404 });
  }

  const topic = await Topic.findById(subtopic.topicId).lean().exec();
  const topicTitle = topic ? topic.title : "";

  // Formulate a premium educational visual prompt for Qwen-Image
  const prompt = `A clean, professional modern vector educational diagram illustrating: ${subtopic.title}. ` +
    `Context: ${topicTitle || "Computer Science concept"}. ` +
    `Visual style: tech-themed vector illustration, high resolution, dark mode friendly dark blue background, vibrant neon accent colors, sleek design elements, suitable for a web application educational panel. ` +
    `Strictly no text, labels, or words in the diagram.`;

  try {
    const base64Image = await generateNvidiaImage(prompt);

    // Save illustrationUrl directly to the subtopic's Content document
    let content = await Content.findOne({ subtopicId: subtopicObjectId }).exec();
    if (content) {
      content.illustrationUrl = base64Image;
      await content.save();
    } else {
      content = await Content.create({
        subtopicId: subtopicObjectId,
        body: "Placeholder subtopic content.",
        examples: [],
        version: 1,
        illustrationUrl: base64Image,
      });
    }

    return NextResponse.json({
      success: true,
      illustrationUrl: base64Image,
    });
  } catch (err) {
    console.error("Image generation failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to generate image" },
      { status: 500 }
    );
  }
}
