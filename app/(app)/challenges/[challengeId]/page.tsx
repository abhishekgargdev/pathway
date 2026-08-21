import { ChallengeView } from "@/components/challenges/challenge-view";

type PageProps = { params: Promise<{ challengeId: string }> };

export default async function ChallengePage({ params }: PageProps) {
  const { challengeId } = await params;
  return <ChallengeView challengeId={challengeId} />;
}
