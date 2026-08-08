"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  createRechargeMethodAction,
  updateRechargeMethodAction,
  type AdminRechargeMethodDetail,
} from "@/lib/actions/recharge-methods";
import { RechargeContactType } from "@/generated/prisma/browser";
import { formInputClass } from "@/lib/ui";
import { MarkdownField } from "@/components/ui/markdown-field";
import { ImageUploadField } from "@/components/ui/image-upload-field";

export function RechargeMethodForm({
  initData,
  editingMethod,
  onSaved,
  onCancel,
}: {
  initData: string;
  editingMethod?: AdminRechargeMethodDetail;
  onSaved?: () => void;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(editingMethod?.name ?? "");
  const [instructions, setInstructions] = useState(editingMethod?.instructions ?? "");
  const [accountDetails, setAccountDetails] = useState(editingMethod?.accountDetails ?? "");
  const [customText, setCustomText] = useState(editingMethod?.customText ?? "");
  const [imageUrl, setImageUrl] = useState(editingMethod?.imageUrl ?? "");
  const [qrCodeUrl, setQrCodeUrl] = useState(editingMethod?.qrCodeUrl ?? "");
  const [displayOrder, setDisplayOrder] = useState(String(editingMethod?.displayOrder ?? 0));
  const [contactType, setContactType] = useState<RechargeContactType | "">(
    editingMethod?.contactType ?? "",
  );
  const [contactValue, setContactValue] = useState(editingMethod?.contactValue ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const payload = {
      name,
      instructions,
      accountDetails: accountDetails || null,
      customText: customText || null,
      imageUrl: imageUrl || null,
      qrCodeUrl: qrCodeUrl || null,
      displayOrder: Number(displayOrder) || 0,
      contactType: contactType || null,
      contactValue: contactValue || null,
    };

    const result = editingMethod
      ? await updateRechargeMethodAction(initData, editingMethod.id, payload)
      : await createRechargeMethodAction(initData, payload);

    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    router.refresh();
    if (editingMethod) {
      onSaved?.();
    } else {
      setName("");
      setInstructions("");
      setAccountDetails("");
      setCustomText("");
      setImageUrl("");
      setQrCodeUrl("");
      setDisplayOrder("0");
      setContactType("");
      setContactValue("");
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4"
    >
      <h2 className="text-sm font-semibold text-foreground">
        {editingMethod ? `Edit ${editingMethod.name} (Admin)` : "Add Recharge Method (Admin)"}
      </h2>

      <input
        className={formInputClass}
        placeholder="Name (e.g. USDT TRC20)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />
      <MarkdownField
        value={instructions}
        onChange={setInstructions}
        placeholder="Instructions"
        required
      />
      <input
        className={formInputClass}
        placeholder="Account details (address / bank info / number)"
        value={accountDetails}
        onChange={(e) => setAccountDetails(e.target.value)}
      />
      <input
        className={formInputClass}
        placeholder="Custom text (optional)"
        value={customText}
        onChange={(e) => setCustomText(e.target.value)}
      />
      <ImageUploadField
        label="Payment instructions image"
        value={imageUrl}
        onChange={setImageUrl}
        initData={initData}
        kind="payment"
        hint="Optional - a screenshot of the payment steps, shown under the instructions."
      />
      <ImageUploadField
        label="QR code"
        value={qrCodeUrl}
        onChange={setQrCodeUrl}
        initData={initData}
        kind="qr"
        hint="Optional - customers scan this to pay."
      />
      <input
        className={formInputClass}
        type="number"
        placeholder="Display order"
        value={displayOrder}
        onChange={(e) => setDisplayOrder(e.target.value)}
      />

      <div className="flex flex-col gap-2 border-t border-border pt-2">
        <p className="text-xs font-medium text-hint">
          &quot;Send proof of payment&quot; redirects customers here
        </p>
        <div className="grid grid-cols-2 gap-3">
          <select
            className={formInputClass}
            value={contactType}
            onChange={(e) => setContactType(e.target.value as RechargeContactType | "")}
          >
            <option value="">No redirect</option>
            <option value={RechargeContactType.WHATSAPP}>WhatsApp</option>
            <option value={RechargeContactType.TELEGRAM}>Telegram</option>
          </select>
          <input
            className={formInputClass}
            placeholder={
              contactType === RechargeContactType.WHATSAPP
                ? "Phone number (e.g. +15551234567)"
                : "Telegram username (e.g. falconunlocker_admin)"
            }
            value={contactValue}
            onChange={(e) => setContactValue(e.target.value)}
            disabled={!contactType}
          />
        </div>
      </div>

      {error ? <p className="text-sm text-accent">{error}</p> : null}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-foreground disabled:opacity-50"
        >
          {submitting
            ? editingMethod
              ? "Saving…"
              : "Creating…"
            : editingMethod
              ? "Save Changes"
              : "Create Method"}
        </button>
        {editingMethod ? (
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
