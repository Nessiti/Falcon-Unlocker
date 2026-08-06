import { Skeleton } from "@/components/ui/skeleton";

/** Placeholder shaped like a rounded-card list row (orders, transactions, etc). */
function RowSkeleton() {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-5 w-16" />
      </div>
      <Skeleton className="h-3 w-2/3" />
      <Skeleton className="h-3 w-1/3" />
    </div>
  );
}

export function RowListSkeleton({ count = 6, className = "" }: { count?: number; className?: string }) {
  return (
    <div className={className}>
      {Array.from({ length: count }).map((_, index) => (
        <RowSkeleton key={index} />
      ))}
    </div>
  );
}
