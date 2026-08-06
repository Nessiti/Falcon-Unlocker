import { Skeleton } from "@/components/ui/skeleton";
import { CatalogSkeleton } from "@/components/ui/catalog-skeleton";

export default function ImeiLoading() {
  return (
    <main className="flex flex-1 flex-col gap-6 px-4 py-6 sm:px-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-64" />
      </div>
      <CatalogSkeleton />
    </main>
  );
}
