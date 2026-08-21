import { SolutionAnalysisView } from "@/components/challenges/solution-analysis-view";

type PageProps = { params: Promise<{ challengeId: string }> };

export default async function AnalysisPage({ params }: PageProps) {
  const { challengeId } = await params;
  return <SolutionAnalysisView challengeId={challengeId} />;
}
