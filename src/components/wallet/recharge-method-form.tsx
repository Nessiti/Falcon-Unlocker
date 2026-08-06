"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createRechargeMethodAction } from "@/lib/actions/recharge-methods";
import { RechargeContactType } from "@/generated/prisma/browser";
import { formInputClass } from "@/lib/ui";

export function RechargeMethodForm({ initData }: { initData: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [instructions, setInstructions] = useState("");
  const [accountDetails, setAccountDetails] = useState("");
  const [customText, setCustomText] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [displayOrder, setDisplayOrder] = useState("0");
  const [contactType, setContactType] = useState<RechargeContactType | "">("");
  const [contactValue, setContactValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const result = await createRechargeMethodAction(initData, {
      name,
      instructions,
      accountDetails: accountDetails || null,
      customText: customText || null,
      imageUrl: imageUrl || null,
      qrCodeUrl: qrCodeUrl || null,
      displayOrder: Number(displayOrder) || 0,
      contactType: contactType || null,
      contactValue: contactValue || null,
    });

    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setName("");
    setInstructions("");
    setAccountDetails("");
    setCustomText("");
    setImageUrl("");
    setQrCodeUrl("");
    setDisplayOrder("0");
    setContactType("");
    setContactValue("");
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4"
    >
      <h2 className="text-sm font-semibold text-foreground">Add Recharge Method (Admin)</h2>

      <input
        className={formInputClass}
        placeholder="Name (e.g. USDT TRC20)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />
      <textarea
        className={formInputClass}
        placeholder="Instructions"
        value={instructions}
        onChange={(e) => setInstructions(e.target.value)}
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
      <input
        className={formInputClass}
        placeholder="Image URL"
        value={imageUrl}
        onChange={(e) => setImageUrl(e.target.value)}
      />
      <input
        className={formInputClass}
        placeholder="QR code URL"
        value={qrCodeUrl}
        onChange={(e) => setQrCodeUrl(e.target.value)}
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

      <button
        type="submit"
        disabled={submitting}
        className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-foreground disabled:opacity-50"
      >
        {submitting ? "Creating…" : "Create Method"}
      </button>
    </form>
  );
}
