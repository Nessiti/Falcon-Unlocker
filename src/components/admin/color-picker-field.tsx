"use client";

const PRESET_COLORS = [
  "#e6283c",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#10b981",
  "#06b6d4",
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#a855f7",
  "#ec4899",
  "#f43f5e",
  "#64748b",
  "#0f172a",
];

/** A no-hex-typing color picker: the native OS/browser color wheel (every
 * color there is) plus one-tap common presets. Used for Brand Settings'
 * button color (Chapter 41) - nobody configuring their own brand should
 * need to know what a hex code is. */
export function ColorPickerField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium text-hint">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value ?? "#000000"}
          onChange={(e) => onChange(e.target.value)}
          aria-label={label}
          className="h-9 w-9 shrink-0 cursor-pointer rounded-lg border border-border bg-transparent p-0"
        />
        <span className="text-xs text-hint">{value ? value.toUpperCase() : "Default (Telegram theme)"}</span>
        {value ? (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-xs font-medium text-accent"
          >
            Reset
          </button>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {PRESET_COLORS.map((swatch) => (
          <button
            key={swatch}
            type="button"
            onClick={() => onChange(swatch)}
            aria-label={swatch}
            title={swatch}
            className={`h-6 w-6 rounded-full border-2 ${
              value?.toLowerCase() === swatch ? "border-foreground" : "border-transparent"
            }`}
            style={{ backgroundColor: swatch }}
          />
        ))}
      </div>
    </div>
  );
}
