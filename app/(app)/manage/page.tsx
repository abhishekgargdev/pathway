import type { Metadata } from "next";

import { ManageView } from "@/components/manage/manage-view";

export const metadata: Metadata = {
  title: "Content Operations | Pathway",
  description: "Monitor and manage the AI generation pipeline and Gemini API limits.",
};

export default function ManagePage() {
  return <ManageView />;
}
