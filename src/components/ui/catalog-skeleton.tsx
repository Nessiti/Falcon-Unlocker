import { Skeleton } from "@/components/ui/skeleton";

/** Placeholder shaped like an IMEI/Server service card, for loading.tsx boundaries. */
function ServiceCardSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-center gap-2">
        <Skeleton className="h-10 w-10 shrink-0" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-4/5" />
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-8 w-24" />
      </div>
    </div>
  );
}

/** Matches the ImeiCatalog/ServerCatalog search bar + responsive card grid shape. */
export function CatalogSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Skeleton className="h-10 w-full min-w-0 sm:flex-1" />
        <Skeleton className="h-10 w-full shrink-0 sm:w-56" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: count }).map((_, index) => (
          <ServiceCardSkeleton key={index} />
        ))}
      </div>
    </div>
  );
}
