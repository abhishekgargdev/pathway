type SkillPageProps = {
  params: Promise<{ skillId: string }>;
};

export default async function SkillPage({ params }: SkillPageProps) {
  const { skillId } = await params;

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-6 md:px-6 md:py-8 lg:px-8">
      <p className="text-[11px] font-semibold tracking-[0.5px] text-[#5EEAD4] uppercase">
        Learning path
      </p>
      <h1 className="mt-2 font-heading text-2xl font-bold tracking-tight text-[#EDEFF7]">
        Path ready to explore
      </h1>
      <p className="mt-2 break-all text-sm text-[#8B93B0]">
        Skill id: {skillId}. The full connected-node tree UI lands next — your
        outline is saved and content is queued for generation.
      </p>
    </main>
  );
}
