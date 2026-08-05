"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createRechargeMethodAction } from "@/lib/actions/recharge-methods";
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
