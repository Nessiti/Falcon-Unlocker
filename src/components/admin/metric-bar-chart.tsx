/**
 * Single-hue horizontal bar chart for comparing one magnitude across
 * providers (Success Rate / Error Rate / Response Time / Orders per
 * Provider - Chapter 20). Sequential one-hue encoding per the dataviz
 * guide's form rule for "compare magnitude, low -> high": identity comes
 * from the row label, not color, so no legend or categorical palette is
 * needed for a single series.
 */
export function MetricBarChart({
  title,
  data,
  formatValue,
}: {
  title: string;
  data: { label: string; value: number }[];
  formatValue: (value: number) => string;
}) {
  const max = Math.max(1, ...data.map((row) => row.value));

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {data.length === 0 ? (
        <p className="text-xs text-hint">No data yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {data.map((row) => (
            <div key={row.label} className="flex items-center gap-2">
              <span className="w-20 shrink-0 truncate text-xs text-hint sm:w-28" title={row.label}>
                {row.label}
              </span>
              <div className="h-3 min-w-0 flex-1 rounded-full bg-background">
                <div
                  className="h-3 rounded-r-[4px] bg-accent"
                  style={{ width: `${Math.max(2, (row.value / max) * 100)}%` }}
                />
              </div>
              <span className="w-14 shrink-0 text-right text-xs text-foreground">
                {formatValue(row.value)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
