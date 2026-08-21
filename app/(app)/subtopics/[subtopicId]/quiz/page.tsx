import { QuizView } from "@/components/subtopics/quiz-view";

type PageProps = { params: Promise<{ subtopicId: string }> };

export default async function QuizPage({ params }: PageProps) {
  const { subtopicId } = await params;
  return <QuizView subtopicId={subtopicId} />;
}
