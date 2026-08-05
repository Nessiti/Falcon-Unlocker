"use client";

import { useState } from "react";
import {
  updateUserStatusAction,
  updateUserRoleAction,
  adjustUserBalanceAction,
  type AdminUserSummary,
} from "@/lib/actions/admin-users";
import { Role, UserStatus } from "@/generated/prisma/browser";
import { formatUsd, formInputClass } from "@/lib/ui";

export function UserRow({
  user,
  initData,
  isAdmin,
  onChanged,
}: {
  user: AdminUserSummary;
  initData: string;
  isAdmin: boolean;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adjusting, setAdjusting] = useState(false);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");

  async function handleStatus(status: UserStatus) {
    setBusy(true);
    setError(null);
    const result = await updateUserStatusAction(initData, { userId: user.id, status });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onChanged();
  }

  async function handleRole(role: Role) {
    setBusy(true);
    setError(null);
    const result = await updateUserRoleAction(initData, { userId: user.id, role });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onChanged();
  }

  async function handleAdjust() {
    const deltaCents = Math.round(Number(amount) * 100);
    if (!Number.isFinite(deltaCents) || deltaCents === 0) {
      setError("Enter a non-zero amount");
      return;
    }
    setBusy(true);
    setError(null);
    const result = await adjustUserBalanceAction(initData, {
      userId: user.id,
      deltaCents,
      reason,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setAdjusting(false);
    setAmount("");
    setReason("");
    onChanged();
  }

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4 text-sm">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="font-medium text-foreground">
            {user.firstName}
            {user.lastName ? ` ${user.lastName}` : ""}
            {user.username ? <span className="text-hint"> · @{user.username}</span> : null}
          </p>
          <p className="text-xs text-hint">
            ID {user.telegramId} · Joined {new Date(user.createdAt).toLocaleDateString()}
          </p>
        </div>
        <span className="shrink-0 text-xs font-medium text-foreground">
          {formatUsd(user.balanceCents)}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {isAdmin ? (
          <select
            className={`${formInputClass} w-auto`}
            value={user.role}
            disabled={busy}
            onChange={(e) => handleRole(e.target.value as Role)}
          >
            <option value={Role.CUSTOMER}>Customer</option>
            <option value={Role.MODERATOR}>Moderator</option>
            <option value={Role.ADMIN}>Admin</option>
          </select>
        ) : (
          <span className="rounded-full bg-background px-2 py-0.5 text-[11px] text-hint">
            {user.role}
          </span>
        )}

        <span className="rounded-full bg-background px-2 py-0.5 text-[11px] text-hint">
          {user.status}
        </span>

        {user.status !== UserStatus.ACTIVE ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => handleStatus(UserStatus.ACTIVE)}
            className="rounded-lg border border-border px-2 py-1 text-xs text-foreground disabled:opacity-50"
          >
            Unblock
          </button>
        ) : (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => handleStatus(UserStatus.SUSPENDED)}
              className="rounded-lg border border-border px-2 py-1 text-xs text-foreground disabled:opacity-50"
            >
              Suspend
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => handleStatus(UserStatus.BLOCKED)}
              className="rounded-lg border border-border px-2 py-1 text-xs text-accent disabled:opacity-50"
            >
              Block
            </button>
          </>
        )}

        {isAdmin ? (
          <button
            type="button"
            onClick={() => setAdjusting((current) => !current)}
            className="rounded-lg border border-border px-2 py-1 text-xs text-foreground"
          >
            Adjust Balance
          </button>
        ) : null}
      </div>

      {adjusting ? (
        <div className="flex flex-wrap gap-2 border-t border-border pt-2">
          <input
            className={`${formInputClass} w-28`}
            type="number"
            step="0.01"
            placeholder="+/- USD"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <input
            className={`${formInputClass} flex-1`}
            placeholder="Reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <button
            type="button"
            disabled={busy}
            onClick={handleAdjust}
            className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground disabled:opacity-50"
          >
            Apply
          </button>
        </div>
      ) : null}

      {error ? <p className="text-xs text-accent">{error}</p> : null}
    </div>
  );
}
