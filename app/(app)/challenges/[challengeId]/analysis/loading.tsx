import { Skeleton } from "@/components/ui/skeleton";

export default function AnalysisLoading() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-5 py-6 md:px-6 lg:px-8">
      <Skeleton className="h-8 w-48 rounded-md bg-[#1F2440]" />
      <Skeleton className="h-40 w-full rounded-2xl bg-[#171B2E]" />
      <Skeleton className="h-56 w-full rounded-2xl bg-[#171B2E]" />
    </div>
  );
}
