import { Skeleton } from "@/components/ui/skeleton";

export default function SubtopicLoading() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-5 py-6 md:px-6 md:py-8 lg:px-8">
      <Skeleton className="h-10 w-10 rounded-xl bg-[#1F2440]" />
      <Skeleton className="h-7 w-56 rounded-md bg-[#1F2440]" />
      <Skeleton className="h-64 w-full rounded-2xl bg-[#171B2E]" />
    </div>
  );
}
