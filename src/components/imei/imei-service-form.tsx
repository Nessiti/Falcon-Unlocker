"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useRawInitData } from "@telegram-apps/sdk-react";
import { useTelegramUser } from "@/components/telegram-user-provider";
import { createImeiServiceAction, type CreateImeiServiceField } from "@/lib/actions/imei-services";
import { Role, ServiceBadge, ServiceFieldType, ServiceStatus } from "@/generated/prisma/browser";
import { formInputClass as inputClass } from "@/lib/ui";

type FieldDraft = {
  label: string;
  type: ServiceFieldType;
  options: string;
  regex: string;
  placeholder: string;
  defaultValue: string;
  required: boolean;
};

function emptyField(): FieldDraft {
  return {
    label: "",
    type: ServiceFieldType.TEXT,
    options: "",
    regex: "",
    placeholder: "",
    defaultValue: "",
    required: false,
  };
}

const FIELD_TYPE_OPTIONS: { value: ServiceFieldType; label: string }[] = [
  { value: ServiceFieldType.TEXT, label: "Text" },
  { value: ServiceFieldType.NUMBER, label: "Number" },
  { value: ServiceFieldType.TEXTAREA, label: "Textarea" },
  { value: ServiceFieldType.SELECT, label: "Select" },
  { value: ServiceFieldType.CHECKBOX, label: "Checkbox" },
  { value: ServiceFieldType.DATE, label: "Date" },
  { value: ServiceFieldType.PASSWORD, label: "Password" },
  { value: ServiceFieldType.EMAIL, label: "Email" },
  { value: ServiceFieldType.IP, label: "IP" },
  { value: ServiceFieldType.IMEI, label: "IMEI" },
  { value: ServiceFieldType.SN, label: "SN" },
  { value: ServiceFieldType.ECID, label: "ECID" },
  { value: ServiceFieldType.JSON, label: "JSON" },
];

export function ImeiServiceForm() {
  const auth = useTelegramUser();
  const initData = useRawInitData();
  const router = useRouter();

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [estimatedTime, setEstimatedTime] = useState("");
  const [status, setStatus] = useState<ServiceStatus>(ServiceStatus.ONLINE);
  const [badge, setBadge] = useState<ServiceBadge | "">("");
  const [imageUrl, setImageUrl] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [displayOrder, setDisplayOrder] = useState("0");
  const [fields, setFields] = useState<FieldDraft[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (auth.status !== "authenticated" || auth.user.role !== Role.ADMIN || !initData) {
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

    const fieldPayload: CreateImeiServiceField[] = fields
      .filter((field) => field.label.trim())
      .map((field, index) => ({
        label: field.label,
        type: field.type,
        options: field.type === ServiceFieldType.SELECT ? field.options : null,
        regex: field.regex || null,
        placeholder: field.placeholder || null,
        defaultValue: field.defaultValue || null,
        required: field.required,
        displayOrder: index,
      }));

    setSubmitting(true);
    const result = await createImeiServiceAction(verifiedInitData, {
      name,
      priceCents,
      description,
      estimatedTime,
      status,
      badge: badge || null,
      imageUrl: imageUrl || null,
      categoryName: categoryName || null,
      displayOrder: Number(displayOrder) || 0,
      fields: fieldPayload,
    });
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    resetForm();
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4"
    >
      <h2 className="text-sm font-semibold text-foreground">Add IMEI Service (Admin)</h2>

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
      <textarea
        className={inputClass}
        placeholder="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        required
      />
      <input
        className={inputClass}
        placeholder="Estimated time (e.g. 24-48 hours)"
        value={estimatedTime}
        onChange={(e) => setEstimatedTime(e.target.value)}
        required
      />

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
          <div
            key={index}
            className="flex flex-col gap-2 rounded-lg border border-border p-2"
          >
            <div className="flex flex-wrap items-center gap-2">
              <input
                className={`${inputClass} flex-1`}
                placeholder="Field label (e.g. IMEI)"
                value={field.label}
                onChange={(e) => updateField(index, { label: e.target.value })}
              />
              <select
                className={inputClass}
                value={field.type}
                onChange={(e) => updateField(index, { type: e.target.value as ServiceFieldType })}
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

            {field.type === ServiceFieldType.SELECT ? (
              <input
                className={inputClass}
                placeholder="Options (comma-separated)"
                value={field.options}
                onChange={(e) => updateField(index, { options: e.target.value })}
              />
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
                placeholder="Default value"
                value={field.defaultValue}
                onChange={(e) => updateField(index, { defaultValue: e.target.value })}
              />
              <input
                className={inputClass}
                placeholder="Regex validation"
                value={field.regex}
                onChange={(e) => updateField(index, { regex: e.target.value })}
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

      <button
        type="submit"
        disabled={submitting}
        className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-foreground disabled:opacity-50"
      >
        {submitting ? "Creating…" : "Create Service"}
      </button>
    </form>
  );
}
