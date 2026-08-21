import { Skeleton } from "@/components/ui/skeleton";

export function DashboardSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-5 py-6 md:gap-5 md:px-6 md:py-8 lg:px-8">
      <div className="space-y-2">
        <Skeleton className="h-4 w-36 rounded-md bg-[#1F2440]" />
        <Skeleton className="h-8 w-56 rounded-md bg-[#1F2440]" />
      </div>
      <Skeleton className="h-32 w-full rounded-2xl bg-[#171B2E]" />
      <Skeleton className="h-40 w-full rounded-2xl bg-[#171B2E]" />
      <div className="space-y-3">
        <Skeleton className="h-5 w-28 rounded-md bg-[#1F2440]" />
        <Skeleton className="h-24 w-full rounded-2xl bg-[#171B2E]" />
        <Skeleton className="h-24 w-full rounded-2xl bg-[#171B2E]" />
      </div>
    </div>
  );
}
