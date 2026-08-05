"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createRechargeOrderAction, type RechargeMethodSummary } from "@/lib/actions/wallet";
import { formInputClass } from "@/lib/ui";

export function RechargeMethodCard({
  method,
  initData,
}: {
  method: RechargeMethodSummary;
  initData: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [proofUrl, setProofUrl] = useState("");
  const [proofNote, setProofNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const amountCents = Math.round(Number(amount) * 100);
    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      setError("Enter a valid amount");
      return;
    }

    setSubmitting(true);
    const result = await createRechargeOrderAction(initData, {
      methodId: method.id,
      amountCents,
      proofUrl: proofUrl.trim() || null,
      proofNote: proofNote.trim() || null,
    });
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setSuccess(true);
    setOpen(false);
    setAmount("");
    setProofUrl("");
    setProofNote("");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4">
      <p className="text-sm font-semibold text-foreground">{method.name}</p>
      <p className="whitespace-pre-line text-sm text-hint">{method.instructions}</p>
      {method.accountDetails ? (
        <p className="whitespace-pre-line text-sm text-foreground">{method.accountDetails}</p>
      ) : null}
      {method.customText ? <p className="text-xs text-hint">{method.customText}</p> : null}
      {method.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- admin-provided image URL
        <img src={method.imageUrl} alt="" className="max-h-32 rounded-lg object-contain" />
      ) : null}
      {method.qrCodeUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- admin-provided QR code
        <img src={method.qrCodeUrl} alt="QR code" className="h-32 w-32 rounded-lg object-contain" />
      ) : null}

      {success ? (
        <p className="text-xs text-foreground">Request submitted. Awaiting admin approval.</p>
      ) : null}

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="self-start rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground"
        >
          Send proof of payment
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2 border-t border-border pt-2">
          <input
            className={formInputClass}
            type="number"
            min="0"
            step="0.01"
            placeholder="Amount sent (USD)"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
          <input
            className={formInputClass}
            placeholder="Proof image URL (optional)"
            value={proofUrl}
            onChange={(e) => setProofUrl(e.target.value)}
          />
          <input
            className={formInputClass}
            placeholder="Reference / note (optional)"
            value={proofNote}
            onChange={(e) => setProofNote(e.target.value)}
          />
          {error ? <p className="text-xs text-accent">{error}</p> : null}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground disabled:opacity-50"
            >
              {submitting ? "Submitting…" : "Submit"}
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
      )}
    </div>
  );
}
