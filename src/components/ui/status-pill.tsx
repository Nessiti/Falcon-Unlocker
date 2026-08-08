import { Icon } from "@/components/ui/icon";
import { statusLabel, statusTone } from "@/lib/status";

/** The one status badge - color, icon and label all resolved from src/lib/status.ts. */
export function StatusPill({ status, className = "" }: { status: string; className?: string }) {
  const tone = statusTone(status);
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${tone.pill} ${className}`}
    >
      <Icon name={tone.icon} className="h-3 w-3" />
      {statusLabel(status)}
    </span>
  );
}
