import { AnalysisView } from "@/components/challenges/analysis-view";

type PageProps = { params: Promise<{ challengeId: string }> };

export default async function AnalysisPage({ params }: PageProps) {
  const { challengeId } = await params;
  return <AnalysisView challengeId={challengeId} />;
}
