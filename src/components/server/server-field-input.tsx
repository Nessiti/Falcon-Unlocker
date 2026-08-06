"use client";

import { useState } from "react";
import { ServerFieldType } from "@/generated/prisma/browser";
import { formInputClass } from "@/lib/ui";
import {
  SERVER_FIELD_RULES,
  filterAllowedChars,
  validateFieldValue,
} from "@/lib/validation/field-formats";

type Field = {
  id: string;
  label: string;
  type: ServerFieldType;
  required: boolean;
  placeholder?: string | null;
  minLength?: number | null;
  maxLength?: number | null;
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
  const [touched, setTouched] = useState(false);
  const label = field.required ? `${field.label} *` : field.label;
  const rule = SERVER_FIELD_RULES[field.type];

  const error =
    touched
      ? validateFieldValue(value, {
          label: field.label,
          required: field.required,
          rule,
          minLength: field.minLength,
          maxLength: field.maxLength,
        })
      : { ok: true as const };
  const hint = !error.ok ? error.error : rule?.hint;
  const hintClass = !error.ok ? "text-accent" : "text-hint";

  return (
    <label className="flex flex-col gap-1 text-xs text-hint">
      {label}
      <input
        type={HTML_TYPE[field.type] ?? "text"}
        className={formInputClass}
        placeholder={field.placeholder ?? rule?.hint ?? undefined}
        inputMode={rule?.inputMode === "numeric" ? "numeric" : undefined}
        maxLength={field.maxLength ?? rule?.maxLength}
        value={value}
        onChange={(e) => onChange(filterAllowedChars(e.target.value, rule))}
        onBlur={() => setTouched(true)}
        required={field.required}
      />
      {hint ? <span className={hintClass}>{hint}</span> : null}
    </label>
  );
}
