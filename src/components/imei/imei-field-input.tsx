"use client";

import { ServiceFieldType } from "@/generated/prisma/browser";
import { formInputClass } from "@/lib/ui";

type Field = {
  id: string;
  label: string;
  type: ServiceFieldType;
  options: string | null;
  regex: string | null;
  placeholder: string | null;
  required: boolean;
};

const HTML_TYPE: Record<string, string> = {
  [ServiceFieldType.DATE]: "date",
  [ServiceFieldType.PASSWORD]: "password",
  [ServiceFieldType.EMAIL]: "email",
};

export function ImeiFieldInput({
  field,
  value,
  onChange,
}: {
  field: Field;
  value: string;
  onChange: (value: string) => void;
}) {
  const label = field.required ? `${field.label} *` : field.label;

  if (field.type === ServiceFieldType.TEXTAREA || field.type === ServiceFieldType.JSON) {
    return (
      <label className="flex flex-col gap-1 text-xs text-hint">
        {label}
        <textarea
          className={formInputClass}
          placeholder={field.placeholder ?? (field.type === ServiceFieldType.JSON ? "{ }" : undefined)}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={field.required}
        />
      </label>
    );
  }

  if (field.type === ServiceFieldType.NUMBER) {
    return (
      <label className="flex flex-col gap-1 text-xs text-hint">
        {label}
        <input
          type="number"
          className={formInputClass}
          placeholder={field.placeholder ?? undefined}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={field.required}
        />
      </label>
    );
  }

  if (field.type === ServiceFieldType.SELECT) {
    const options = (field.options ?? "")
      .split(",")
      .map((option) => option.trim())
      .filter(Boolean);
    return (
      <label className="flex flex-col gap-1 text-xs text-hint">
        {label}
        <select
          className={formInputClass}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={field.required}
        >
          <option value="">Select…</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
    );
  }

  if (field.type === ServiceFieldType.CHECKBOX) {
    return (
      <label className="flex items-center gap-2 text-xs text-hint">
        <input
          type="checkbox"
          checked={value === "true"}
          onChange={(e) => onChange(e.target.checked ? "true" : "false")}
        />
        {label}
      </label>
    );
  }

  return (
    <label className="flex flex-col gap-1 text-xs text-hint">
      {label}
      <input
        type={HTML_TYPE[field.type] ?? "text"}
        className={formInputClass}
        placeholder={field.placeholder ?? undefined}
        pattern={field.regex ?? undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={field.required}
      />
    </label>
  );
}
