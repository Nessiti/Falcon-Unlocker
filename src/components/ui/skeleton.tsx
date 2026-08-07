/** Pulsing placeholder block (Chapter 21 - Performance: Skeleton Loading). */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-surface ${className}`} />;
}
