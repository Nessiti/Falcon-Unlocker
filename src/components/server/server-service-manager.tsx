"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useRawInitData } from "@telegram-apps/sdk-react";
import { useTelegramUser } from "@/components/telegram-user-provider";
import {
  listAllServerServicesAction,
  setServerServiceStatusAction,
  deleteServerServiceAction,
  duplicateServerServiceAction,
  type AdminServerServiceSummary,
} from "@/lib/actions/server-services";
import { Role, ServiceStatus } from "@/generated/prisma/browser";
import { formatUsd } from "@/lib/ui";

const STATUS_OPTIONS: ServiceStatus[] = [
  ServiceStatus.ONLINE,
  ServiceStatus.OFFLINE,
  ServiceStatus.MAINTENANCE,
];

export function ServerServiceManager() {
  const auth = useTelegramUser();
  const initData = useRawInitData();
  const router = useRouter();
  const [services, setServices] = useState<AdminServerServiceSummary[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    if (!initData) return;
    listAllServerServicesAction(initData).then((result) => {
      if (result.ok) setServices(result.services);
      else setError(result.error);
    });
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initData]);

  if (auth.status !== "authenticated" || auth.user.role !== Role.ADMIN || !initData) {
    return null;
  }
  const verifiedInitData = initData;

  async function handleStatus(id: string, status: ServiceStatus) {
    setBusyId(id);
    const result = await setServerServiceStatusAction(verifiedInitData, id, status);
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
    const result = await deleteServerServiceAction(verifiedInitData, id);
    setBusyId(null);
    if (result.ok) {
      refresh();
      router.refresh();
    } else {
      setError(result.error);
    }
  }

  async function handleDuplicate(id: string) {
    setBusyId(id);
    const result = await duplicateServerServiceAction(verifiedInitData, id);
    setBusyId(null);
    if (result.ok) refresh();
    else setError(result.error);
  }

  if (!services) return null;

  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold text-foreground">Manage Services (Admin)</h2>
      {error ? <p className="text-xs text-accent">{error}</p> : null}
      {services.map((service) => (
        <div
          key={service.id}
          className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4 text-sm"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-foreground">{service.name}</p>
            <span className="text-xs text-hint">
              {formatUsd(service.priceCents)} · {service.fieldCount} fields
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map((status) => (
              <button
                key={status}
                type="button"
                disabled={busyId === service.id}
                onClick={() => handleStatus(service.id, status)}
                className={`rounded-lg px-2 py-1 text-xs disabled:opacity-50 ${
                  service.status === status
                    ? "bg-accent text-accent-foreground"
                    : "border border-border text-foreground"
                }`}
              >
                {status}
              </button>
            ))}
            <button
              type="button"
              disabled={busyId === service.id}
              onClick={() => handleDuplicate(service.id)}
              className="rounded-lg border border-border px-2 py-1 text-xs text-foreground disabled:opacity-50"
            >
              Duplicate
            </button>
            <button
              type="button"
              disabled={busyId === service.id}
              onClick={() => handleDelete(service.id)}
              className="rounded-lg border border-border px-2 py-1 text-xs text-accent disabled:opacity-50"
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
