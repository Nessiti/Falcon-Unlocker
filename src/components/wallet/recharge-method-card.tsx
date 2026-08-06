"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { hapticFeedbackNotificationOccurred } from "@telegram-apps/sdk-react";
import { createRechargeOrderAction, type RechargeMethodSummary } from "@/lib/actions/wallet";
import { RechargeContactType } from "@/generated/prisma/browser";
import { formInputClass } from "@/lib/ui";

function buildContactUrl(method: RechargeMethodSummary, message: string) {
  if (!method.contactType || !method.contactValue) return null;

  if (method.contactType === RechargeContactType.WHATSAPP) {
    const digits = method.contactValue.replace(/\D/g, "");
    return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
  }

  const username = method.contactValue.replace(/^@/, "");
  return `https://t.me/${username}?text=${encodeURIComponent(message)}`;
}

function notifyHaptic(type: "success" | "error") {
  if (hapticFeedbackNotificationOccurred.isAvailable()) {
    hapticFeedbackNotificationOccurred(type);
  }
}

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

    const contactUrl = buildContactUrl(
      method,
      `Hi, I'd like to send proof of payment for a recharge of ${amount} USD via ${method.name}.`,
    );
    // Opened synchronously (before the await) so browsers don't treat it as a
    // blocked popup — navigated to the real URL once the order is created.
    const contactWindow = contactUrl ? window.open("", "_blank") : null;

    setSubmitting(true);
    const result = await createRechargeOrderAction(initData, {
      methodId: method.id,
      amountCents,
      proofNote: proofNote.trim() || null,
    });
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      contactWindow?.close();
      notifyHaptic("error");
      return;
    }

    if (contactWindow && contactUrl) {
      contactWindow.location.href = contactUrl;
    }

    notifyHaptic("success");
    setSuccess(true);
    setOpen(false);
    setAmount("");
    setProofNote("");
    router.refresh();
  }

  if (success) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface p-6 text-center">
        <span className="text-4xl" aria-hidden>
          ✅
        </span>
        <div>
          <p className="text-sm font-semibold text-foreground">Request submitted!</p>
          <p className="mt-1 text-xs text-hint">
            {method.contactType
              ? `We've opened ${method.contactType === RechargeContactType.WHATSAPP ? "WhatsApp" : "Telegram"} — send your proof of payment there to complete your request.`
              : "Your recharge request is awaiting admin approval. You'll be notified once it's reviewed."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setSuccess(false)}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground"
        >
          Done
        </button>
      </div>
    );
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
          {method.contactType ? (
            <p className="text-xs text-hint">
              After submitting, we&apos;ll open{" "}
              {method.contactType === RechargeContactType.WHATSAPP ? "WhatsApp" : "Telegram"} so you
              can send your proof directly.
            </p>
          ) : null}
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
              {submitting
                ? "Submitting…"
                : method.contactType
                  ? "Submit & Open Chat"
                  : "Submit"}
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
