import { SubtopicContentView } from "@/components/subtopics/subtopic-content-view";

type PageProps = { params: Promise<{ subtopicId: string }> };

export default async function SubtopicPage({ params }: PageProps) {
  const { subtopicId } = await params;
  return <SubtopicContentView subtopicId={subtopicId} />;
}
