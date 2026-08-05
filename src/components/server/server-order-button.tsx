"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useRawInitData } from "@telegram-apps/sdk-react";
import { useTelegramUser } from "@/components/telegram-user-provider";
import { createServerOrderAction } from "@/lib/actions/server-orders";
import { ServerFieldInput } from "@/components/server/server-field-input";
import type { ServerFieldType } from "@/generated/prisma/browser";
import { formInputClass } from "@/lib/ui";

type Field = {
  id: string;
  label: string;
  type: ServerFieldType;
  required: boolean;
};

export function ServerOrderButton({ serviceId, fields }: { serviceId: string; fields: Field[] }) {
  const auth = useTelegramUser();
  const initData = useRawInitData();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (auth.status !== "authenticated" || !initData) return null;
  const verifiedInitData = initData;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const result = await createServerOrderAction(verifiedInitData, {
      serviceId,
      fieldValues: values,
      notes: notes.trim() || null,
    });

    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setOpen(false);
    setValues({});
    setNotes("");
    router.refresh();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground"
      >
        Order
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 border-t border-border pt-3">
      {fields.map((field) => (
        <ServerFieldInput
          key={field.id}
          field={field}
          value={values[field.id] ?? ""}
          onChange={(value) => setValues((current) => ({ ...current, [field.id]: value }))}
        />
      ))}
      <textarea
        className={formInputClass}
        placeholder="Notes (optional)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />
      {error ? <p className="text-xs text-accent">{error}</p> : null}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground disabled:opacity-50"
        >
          {submitting ? "Placing…" : "Confirm Order"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg border border-border px-3 py-1.5 text-sm text-foreground"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
