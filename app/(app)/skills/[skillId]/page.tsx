import { SkillPathView } from "@/components/skills/skill-path-view";

type SkillPageProps = {
  params: Promise<{ skillId: string }>;
};

export default async function SkillPage({ params }: SkillPageProps) {
  const { skillId } = await params;
  return <SkillPathView skillId={skillId} />;
}
