import { Skeleton } from "@/components/ui/skeleton";

export function SkillPathSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-5 py-6 md:gap-5 md:px-6 md:py-8 lg:px-8">
      <div className="flex items-center gap-3">
        <Skeleton className="size-10 rounded-xl bg-[#1F2440]" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-48 rounded-md bg-[#1F2440]" />
          <Skeleton className="h-3 w-28 rounded-md bg-[#1F2440]" />
        </div>
      </div>
      <Skeleton className="h-[420px] w-full rounded-2xl bg-[#171B2E]" />
    </div>
  );
}
