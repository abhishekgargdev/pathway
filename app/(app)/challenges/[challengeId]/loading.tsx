import { Skeleton } from "@/components/ui/skeleton";

export default function ChallengeLoading() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-5 py-6 md:px-6 lg:px-8">
      <Skeleton className="h-10 w-10 rounded-xl bg-[#1F2440]" />
      <Skeleton className="h-8 w-64 rounded-md bg-[#1F2440]" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-2xl bg-[#171B2E]" />
        <Skeleton className="h-64 rounded-2xl bg-[#171B2E]" />
      </div>
    </div>
  );
}
