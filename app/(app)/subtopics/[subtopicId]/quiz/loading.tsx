import { Skeleton } from "@/components/ui/skeleton";

export default function QuizLoading() {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4 px-5 py-6">
      <Skeleton className="h-9 w-9 rounded-[10px] bg-[#1F2440]" />
      <Skeleton className="h-40 w-full rounded-2xl bg-[#171B2E]" />
    </div>
  );
}
