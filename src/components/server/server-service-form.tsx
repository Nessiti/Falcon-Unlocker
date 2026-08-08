"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useRawInitData } from "@telegram-apps/sdk-react";
import { useTelegramUser } from "@/components/telegram-user-provider";
import {
  createServerServiceAction,
  updateServerServiceAction,
  type CreateServerServiceField,
  type ServerServiceDetail,
} from "@/lib/actions/server-services";
import {
  Role,
  ServerFieldType,
  ServerServiceType,
  ServiceBadge,
  ServiceStatus,
} from "@/generated/prisma/browser";
import { formInputClass as inputClass } from "@/lib/ui";
import { SERVER_FIELD_RULES } from "@/lib/validation/field-formats";
import { MarkdownField } from "@/components/ui/markdown-field";

type FieldDraft = {
  id?: string;
  label: string;
  type: ServerFieldType;
  required: boolean;
  placeholder: string;
  minLength: string;
  maxLength: string;
};

function emptyField(): FieldDraft {
  return {
    label: "",
    type: ServerFieldType.USERNAME,
    required: false,
    placeholder: "",
    minLength: "",
    maxLength: "",
  };
}

const SERVICE_TYPE_OPTIONS: { value: ServerServiceType; label: string }[] = [
  { value: ServerServiceType.LICENSE, label: "License" },
  { value: ServerServiceType.ACTIVATION, label: "Activation" },
  { value: ServerServiceType.CREDITS, label: "Credits" },
  { value: ServerServiceType.SUBSCRIPTION, label: "Subscription" },
  { value: ServerServiceType.UNLOCK, label: "Unlock" },
  { value: ServerServiceType.FRP, label: "FRP" },
  { value: ServerServiceType.FLASH, label: "Flash" },
  { value: ServerServiceType.REPAIR, label: "Repair" },
];

const FIELD_TYPE_OPTIONS: { value: ServerFieldType; label: string }[] = [
  { value: ServerFieldType.USERNAME, label: "Username" },
  { value: ServerFieldType.PASSWORD, label: "Password" },
  { value: ServerFieldType.TOKEN, label: "Token" },
  { value: ServerFieldType.IP, label: "IP" },
  { value: ServerFieldType.SERIAL, label: "Serial" },
  { value: ServerFieldType.CUSTOM_TEXTBOX, label: "Custom Textbox" },
];

export function ServerServiceForm({
  editingService,
  onSaved,
  onCancel,
  onChanged,
}: {
  editingService?: ServerServiceDetail;
  onSaved?: () => void;
  onCancel?: () => void;
  onChanged?: () => void;
} = {}) {
  const auth = useTelegramUser();
  const initData = useRawInitData();
  const router = useRouter();

  const [name, setName] = useState(editingService?.name ?? "");
  const [price, setPrice] = useState(
    editingService ? String(editingService.priceCents / 100) : "",
  );
  const [description, setDescription] = useState(editingService?.description ?? "");
  const [estimatedTime, setEstimatedTime] = useState(editingService?.estimatedTime ?? "");
  const [type, setType] = useState<ServerServiceType>(
    editingService?.type ?? ServerServiceType.UNLOCK,
  );
  const [status, setStatus] = useState<ServiceStatus>(editingService?.status ?? ServiceStatus.ONLINE);
  const [badge, setBadge] = useState<ServiceBadge | "">(editingService?.badge ?? "");
  const [imageUrl, setImageUrl] = useState(editingService?.imageUrl ?? "");
  const [categoryName, setCategoryName] = useState(editingService?.categoryName ?? "");
  const [displayOrder, setDisplayOrder] = useState(String(editingService?.displayOrder ?? 0));
  const [fields, setFields] = useState<FieldDraft[]>(
    () =>
      editingService?.fields.map((field) => ({
        id: field.id,
        label: field.label,
        type: field.type,
        required: field.required,
        placeholder: field.placeholder ?? "",
        minLength: field.minLength != null ? String(field.minLength) : "",
        maxLength: field.maxLength != null ? String(field.maxLength) : "",
      })) ?? [],
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (
    auth.status !== "authenticated" ||
    (auth.user.role !== Role.ADMIN && auth.user.role !== Role.SUPER_ADMIN) ||
    !initData
  ) {
    return null;
  }
  const verifiedInitData = initData;

  function updateField(index: number, patch: Partial<FieldDraft>) {
    setFields((current) =>
      current.map((field, i) => (i === index ? { ...field, ...patch } : field)),
    );
  }

  function resetForm() {
    setName("");
    setPrice("");
    setDescription("");
    setEstimatedTime("");
    setType(ServerServiceType.UNLOCK);
    setStatus(ServiceStatus.ONLINE);
    setBadge("");
    setImageUrl("");
    setCategoryName("");
    setDisplayOrder("0");
    setFields([]);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const priceCents = Math.round(Number(price) * 100);
    if (!Number.isFinite(priceCents) || priceCents < 0) {
      setError("Enter a valid price");
      return;
    }

    const fieldPayload: (CreateServerServiceField & { id?: string })[] = fields
      .filter((field) => field.label.trim())
      .map((field, index) => ({
        id: field.id,
        label: field.label,
        type: field.type,
        required: field.required,
        displayOrder: index,
        placeholder: field.placeholder || null,
        minLength: field.minLength.trim() ? Number(field.minLength) : null,
        maxLength: field.maxLength.trim() ? Number(field.maxLength) : null,
      }));

    const payload = {
      name,
      priceCents,
      description,
      estimatedTime,
      type,
      status,
      badge: badge || null,
      imageUrl: imageUrl || null,
      categoryName: categoryName || null,
      displayOrder: Number(displayOrder) || 0,
      fields: fieldPayload,
    };

    setSubmitting(true);
    const result = editingService
      ? await updateServerServiceAction(verifiedInitData, editingService.id, payload)
      : await createServerServiceAction(verifiedInitData, payload);
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    router.refresh();
    onChanged?.();
    if (editingService) {
      onSaved?.();
    } else {
      resetForm();
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4"
    >
      <h2 className="text-sm font-semibold text-foreground">
        {editingService ? `Edit ${editingService.name} (Admin)` : "Add Server Service (Admin)"}
      </h2>

      <input
        className={inputClass}
        placeholder="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />
      <input
        className={inputClass}
        placeholder="Price (USD)"
        type="number"
        min="0"
        step="0.01"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        required
      />
      <MarkdownField
        value={description}
        onChange={setDescription}
        placeholder="Description"
        required
      />
      <input
        className={inputClass}
        placeholder="Estimated time (e.g. 24-48 hours)"
        value={estimatedTime}
        onChange={(e) => setEstimatedTime(e.target.value)}
        required
      />

      <select
        className={inputClass}
        value={type}
        onChange={(e) => setType(e.target.value as ServerServiceType)}
      >
        {SERVICE_TYPE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <div className="grid grid-cols-2 gap-3">
        <select
          className={inputClass}
          value={status}
          onChange={(e) => setStatus(e.target.value as ServiceStatus)}
        >
          <option value={ServiceStatus.ONLINE}>Online</option>
          <option value={ServiceStatus.OFFLINE}>Offline</option>
          <option value={ServiceStatus.MAINTENANCE}>Maintenance</option>
        </select>
        <select
          className={inputClass}
          value={badge}
          onChange={(e) => setBadge(e.target.value as ServiceBadge | "")}
        >
          <option value="">No badge</option>
          <option value={ServiceBadge.POPULAR}>Popular</option>
          <option value={ServiceBadge.NEW}>New</option>
          <option value={ServiceBadge.FEATURED}>Featured</option>
        </select>
      </div>

      <input
        className={inputClass}
        placeholder="Image URL"
        value={imageUrl}
        onChange={(e) => setImageUrl(e.target.value)}
      />
      <input
        className={inputClass}
        placeholder="Category"
        value={categoryName}
        onChange={(e) => setCategoryName(e.target.value)}
      />
      <input
        className={inputClass}
        placeholder="Display order"
        type="number"
        value={displayOrder}
        onChange={(e) => setDisplayOrder(e.target.value)}
      />

      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium text-hint">Custom Fields</p>
        {fields.map((field, index) => (
          <div key={index} className="flex flex-col gap-2 rounded-lg border border-border p-2">
            <div className="flex flex-wrap items-center gap-2">
              <input
                className={`${inputClass} flex-1`}
                placeholder="Field label (e.g. Panel Username)"
                value={field.label}
                onChange={(e) => updateField(index, { label: e.target.value })}
              />
              <select
                className={inputClass}
                value={field.type}
                onChange={(e) => updateField(index, { type: e.target.value as ServerFieldType })}
              >
                {FIELD_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-1 text-xs text-hint">
                <input
                  type="checkbox"
                  checked={field.required}
                  onChange={(e) => updateField(index, { required: e.target.checked })}
                />
                Required
              </label>
              <button
                type="button"
                onClick={() => setFields((current) => current.filter((_, i) => i !== index))}
                className="text-xs text-accent"
              >
                Remove
              </button>
            </div>

            {SERVER_FIELD_RULES[field.type]?.hint ? (
              <p className="text-[11px] text-hint">
                Default format: {SERVER_FIELD_RULES[field.type]?.hint} - leave Min/Max length blank
                to use it, or override below.
              </p>
            ) : null}

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <input
                className={inputClass}
                placeholder="Placeholder"
                value={field.placeholder}
                onChange={(e) => updateField(index, { placeholder: e.target.value })}
              />
              <input
                className={inputClass}
                type="number"
                min="0"
                placeholder="Min length"
                value={field.minLength}
                onChange={(e) => updateField(index, { minLength: e.target.value })}
              />
              <input
                className={inputClass}
                type="number"
                min="0"
                placeholder="Max length"
                value={field.maxLength}
                onChange={(e) => updateField(index, { maxLength: e.target.value })}
              />
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setFields((current) => [...current, emptyField()])}
          className="self-start rounded-lg border border-border px-3 py-1.5 text-xs text-foreground hover:bg-background"
        >
          + Add field
        </button>
      </div>

      {error ? <p className="text-sm text-accent">{error}</p> : null}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-foreground disabled:opacity-50"
        >
          {submitting
            ? editingService
              ? "Saving…"
              : "Creating…"
            : editingService
              ? "Save Changes"
              : "Create Service"}
        </button>
        {editingService ? (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-border px-3 py-2 text-sm text-foreground"
          >
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
}
