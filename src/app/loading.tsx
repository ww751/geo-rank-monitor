import { Skeleton } from "@/components/skeleton";

export default function LoadingPage() {
  return (
    <div className="space-y-6">
      <header className="border-b border-slate-200 pb-5">
        <Skeleton className="mb-2 h-4 w-24" />
        <Skeleton className="mb-2 h-8 w-80" />
        <Skeleton className="h-4 w-96" />
      </header>
      <div className="rounded border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-[62px] rounded" />
          ))}
        </div>
      </div>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-[120px] rounded" />
        ))}
      </section>
    </div>
  );
}
