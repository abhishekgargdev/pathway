import { Schema, models, model, type Model, type Types } from "mongoose";

export interface IContentExample {
  title?: string;
  explanation?: string;
  code?: string;
  language?: string;
}

export interface IContent {
  subtopicId: Types.ObjectId;
  body: string;
  examples: IContentExample[];
  generatedAt?: Date;
  generatedByKeyIndex?: number;
  version: number;
}

const ContentExampleSchema = new Schema<IContentExample>(
  {
    title: { type: String },
    explanation: { type: String },
    code: { type: String },
    language: { type: String },
  },
  { _id: false },
);

const ContentSchema = new Schema<IContent>({
  subtopicId: {
    type: Schema.Types.ObjectId,
    ref: "Subtopic",
    required: true,
    unique: true,
  },
  body: { type: String, required: true },
  examples: { type: [ContentExampleSchema], default: [] },
  generatedAt: { type: Date },
  generatedByKeyIndex: { type: Number },
  version: { type: Number, default: 1 },
});

export const Content: Model<IContent> =
  models.Content || model<IContent>("Content", ContentSchema);
