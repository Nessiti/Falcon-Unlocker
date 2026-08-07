"use client";

import { useEffect, useState } from "react";
import { useRawInitData } from "@telegram-apps/sdk-react";
import { getReferralInfoAction, type ReferralInfo } from "@/lib/actions/referrals";
import { formatUsd } from "@/lib/ui";

export default function ReferralsPage() {
  const initData = useRawInitData();
  const [info, setInfo] = useState<ReferralInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!initData) return;
    getReferralInfoAction(initData).then((result) => {
      if (result.ok) setInfo(result.info);
      else setError(result.error);
    });
  }, [initData]);

  async function handleCopy() {
    if (!info?.referralLink) return;
    await navigator.clipboard.writeText(info.referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleShare() {
    if (!info?.referralLink) return;
    try {
      await navigator.share({ title: "Join me here", url: info.referralLink });
    } catch {
      // User cancelled the share sheet - nothing to do.
    }
  }

  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  return (
    <main className="flex flex-1 flex-col gap-6 px-4 py-6 sm:px-6">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Referrals</h1>
        <p className="text-sm text-hint">
          Invite friends with your link. Once their first order is completed, you get{" "}
          {info ? formatUsd(info.bonusCents) : "a bonus"} added to your balance.
        </p>
      </div>

      {error ? <p className="text-sm text-accent">{error}</p> : null}

      {!info ? (
        <p className="text-sm text-hint">Loading…</p>
      ) : (
        <>
          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
            {info.referralLink ? (
              <>
                <p className="break-all rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground">
                  {info.referralLink}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="flex-1 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-foreground"
                  >
                    {copied ? "Copied!" : "Copy Link"}
                  </button>
                  {canShare ? (
                    <button
                      type="button"
                      onClick={handleShare}
                      className="flex-1 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground"
                    >
                      Share
                    </button>
                  ) : null}
                </div>
              </>
            ) : (
              <p className="text-sm text-hint">Your referral link isn&apos;t ready yet.</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-border bg-surface p-4">
              <p className="text-xs text-hint">Friends invited</p>
              <p className="mt-1 text-lg font-semibold text-foreground">{info.referredCount}</p>
            </div>
            <div className="rounded-2xl border border-border bg-surface p-4">
              <p className="text-xs text-hint">Bonuses earned</p>
              <p className="mt-1 text-lg font-semibold text-foreground">
                {formatUsd(info.rewardedCount * info.bonusCents)}
              </p>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
