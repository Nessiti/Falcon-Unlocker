"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  listAllRechargeMethodsAction,
  setRechargeMethodActiveAction,
  deleteRechargeMethodAction,
  type AdminRechargeMethodDetail,
} from "@/lib/actions/recharge-methods";
import { RechargeMethodForm } from "@/components/wallet/recharge-method-form";

/** Admin management list for recharge methods: Edit / Activate-Deactivate / Delete. */
export function RechargeMethodManager({ initData }: { initData: string }) {
  const router = useRouter();
  const [methods, setMethods] = useState<AdminRechargeMethodDetail[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingMethod, setEditingMethod] = useState<AdminRechargeMethodDetail | null>(null);

  function refresh() {
    listAllRechargeMethodsAction(initData).then((result) => {
      if (result.ok) setMethods(result.methods);
      else setError(result.error);
    });
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initData]);

  async function handleToggleActive(method: AdminRechargeMethodDetail) {
    setBusyId(method.id);
    const result = await setRechargeMethodActiveAction(initData, method.id, !method.active);
    setBusyId(null);
    if (result.ok) {
      refresh();
      router.refresh();
    } else {
      setError(result.error);
    }
  }

  async function handleDelete(id: string) {
    setBusyId(id);
    const result = await deleteRechargeMethodAction(initData, id);
    setBusyId(null);
    if (result.ok) {
      refresh();
      router.refresh();
    } else {
      setError(result.error);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold text-foreground">Manage Recharge Methods (Admin)</h2>
      {error ? <p className="text-xs text-accent">{error}</p> : null}
      {!methods && !error ? <p className="text-sm text-hint">Loading…</p> : null}
      {methods && methods.length === 0 ? (
        <p className="text-sm text-hint">No recharge methods yet.</p>
      ) : null}

      {methods?.map((method) =>
        editingMethod?.id === method.id ? (
          <RechargeMethodForm
            key={method.id}
            initData={initData}
            editingMethod={editingMethod}
            onSaved={() => {
              setEditingMethod(null);
              refresh();
            }}
            onCancel={() => setEditingMethod(null)}
          />
        ) : (
          <div
            key={method.id}
            className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4 text-sm"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-foreground">{method.name}</p>
              <span className="text-xs text-hint">
                {method.contactType
                  ? `${method.contactType === "WHATSAPP" ? "WhatsApp" : "Telegram"} redirect`
                  : "No redirect"}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busyId === method.id}
                onClick={() => setEditingMethod(method)}
                className="rounded-lg border border-border px-2 py-1 text-xs text-foreground disabled:opacity-50"
              >
                Edit
              </button>
              <button
                type="button"
                disabled={busyId === method.id}
                onClick={() => handleToggleActive(method)}
                className={`rounded-lg px-2 py-1 text-xs disabled:opacity-50 ${
                  method.active
                    ? "border border-border text-foreground"
                    : "bg-accent text-accent-foreground"
                }`}
              >
                {method.active ? "Deactivate" : "Activate"}
              </button>
              <button
                type="button"
                disabled={busyId === method.id}
                onClick={() => handleDelete(method.id)}
                className="rounded-lg border border-border px-2 py-1 text-xs text-accent disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          </div>
        ),
      )}
    </div>
  );
}
