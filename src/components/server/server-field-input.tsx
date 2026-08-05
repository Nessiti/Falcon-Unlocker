"use client";

import { ServerFieldType } from "@/generated/prisma/browser";
import { formInputClass } from "@/lib/ui";

type Field = {
  id: string;
  label: string;
  type: ServerFieldType;
  required: boolean;
};

const HTML_TYPE: Record<string, string> = {
  [ServerFieldType.PASSWORD]: "password",
};

export function ServerFieldInput({
  field,
  value,
  onChange,
}: {
  field: Field;
  value: string;
  onChange: (value: string) => void;
}) {
  const label = field.required ? `${field.label} *` : field.label;

  return (
    <label className="flex flex-col gap-1 text-xs text-hint">
      {label}
      <input
        type={HTML_TYPE[field.type] ?? "text"}
        className={formInputClass}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={field.required}
      />
    </label>
  );
}
