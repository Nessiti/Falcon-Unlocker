"use client";

import { useEffect, useState } from "react";
import {
  listServiceMappingsAction,
  createServiceMappingAction,
  updateServiceMappingAction,
  deleteServiceMappingAction,
  fetchProviderServicesAction,
  autoMapServiceAction,
  setServiceRoutingStrategyAction,
  getRoutingPreviewAction,
  applySuggestedPriceAction,
  type MappingKind,
  type ServiceMappingSummary,
  type ProviderServiceOption,
  type RoutingPlan,
} from "@/lib/actions/admin-service-mappings";
import { listProvidersAction, type ProviderSummary } from "@/lib/actions/admin-providers";
import { RoutingStrategy } from "@/generated/prisma/browser";
import { formatUsd } from "@/lib/ui";

const STRATEGY_LABEL: Record<RoutingStrategy, string> = {
  CHEAPEST: "Cheapest provider",
  FASTEST: "Fastest provider",
  HIGHEST_SUCCESS_RATE: "Highest success rate",
  PREFERRED: "Preferred provider (priority order)",
  MANUAL: "Manual selection (no auto-fallback)",
};

const STRATEGY_OPTIONS: RoutingStrategy[] = [
  RoutingStrategy.CHEAPEST,
  RoutingStrategy.FASTEST,
  RoutingStrategy.HIGHEST_SUCCESS_RATE,
  RoutingStrategy.PREFERRED,
  RoutingStrategy.MANUAL,
];

export function ServiceMappingManager({
  initData,
  kind,
  falconServiceId,
  falconServiceName,
}: {
  initData: string;
  kind: MappingKind;
  falconServiceId: string;
  falconServiceName: string;
}) {
  const [mappings, setMappings] = useState<ServiceMappingSummary[] | null>(null);
  const [routingStrategy, setRoutingStrategy] = useState<RoutingStrategy | null>(null);
  const [savingStrategy, setSavingStrategy] = useState(false);
  const [providers, setProviders] = useState<ProviderSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [selectedProviderId, setSelectedProviderId] = useState("");
  const [catalog, setCatalog] = useState<ProviderServiceOption[] | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [selectedProviderServiceId, setSelectedProviderServiceId] = useState("");
  const [showAllKinds, setShowAllKinds] = useState(false);
  const [manualProviderServiceId, setManualProviderServiceId] = useState("");
  const [addPriority, setAddPriority] = useState(0);
  const [addMarginPercent, setAddMarginPercent] = useState("");
  const [addMarginCents, setAddMarginCents] = useState("");
  const [adding, setAdding] = useState(false);
  const [applyingPriceId, setApplyingPriceId] = useState<string | null>(null);

  const [autoMapProviderIds, setAutoMapProviderIds] = useState<string[]>([]);
  const [autoMapping, setAutoMapping] = useState(false);
  const [autoMapSummary, setAutoMapSummary] = useState<string | null>(null);

  const [routingPlan, setRoutingPlan] = useState<RoutingPlan | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);

  function refresh() {
    listServiceMappingsAction(initData, kind, falconServiceId).then((result) => {
      if (result.ok) {
        setMappings(result.mappings);
        setRoutingStrategy(result.routingStrategy);
      } else {
        setError(result.error);
      }
    });
  }

  useEffect(() => {
    refresh();
    listProvidersAction(initData).then((result) => {
      if (result.ok) setProviders(result.providers);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initData, kind, falconServiceId]);

  async function handleStrategyChange(strategy: RoutingStrategy) {
    setSavingStrategy(true);
    const result = await setServiceRoutingStrategyAction(initData, kind, falconServiceId, strategy);
    setSavingStrategy(false);
    if (result.ok) {
      setRoutingStrategy(strategy);
      setRoutingPlan(null);
    } else {
      setError(result.error);
    }
  }

  async function handlePreviewRouting() {
    setLoadingPlan(true);
    setPlanError(null);
    const result = await getRoutingPreviewAction(initData, kind, falconServiceId);
    setLoadingPlan(false);
    if (result.ok) setRoutingPlan(result.plan);
    else setPlanError(result.error);
  }

  // Providers that serve both rails from one catalog (Falcon, GSM Theme,
  // WebX) tag each service. Mapping a Server service onto an IMEI service
  // sends the order down the wrong code path and it fails at the provider,
  // so the picker hides the other rail by default. Services the provider
  // left untagged are always shown - an unknown kind must never make a
  // service unreachable.
  const visibleCatalog = catalog?.filter(
    (service) => showAllKinds || service.kind == null || service.kind === kind,
  );
  const hiddenByKind = (catalog?.length ?? 0) - (visibleCatalog?.length ?? 0);

  async function handleBrowseCatalog() {
    if (!selectedProviderId) return;
    setLoadingCatalog(true);
    setCatalogError(null);
    setCatalog(null);
    const result = await fetchProviderServicesAction(initData, selectedProviderId);
    setLoadingCatalog(false);
    if (result.ok) setCatalog(result.services);
    else setCatalogError(result.error);
  }

  async function handleAddMapping() {
    if (!selectedProviderId) return;
    const providerServiceId = selectedProviderServiceId || manualProviderServiceId.trim();
    if (!providerServiceId) return;
    const matched = catalog?.find((service) => service.providerServiceId === providerServiceId);

    setAdding(true);
    const result = await createServiceMappingAction(initData, kind, falconServiceId, {
      providerId: selectedProviderId,
      providerServiceId,
      providerServiceName: matched?.name ?? null,
      providerPriceCents: matched?.priceCents ?? null,
      providerEstimatedTime: matched?.estimatedTime ?? null,
      providerCategory: matched?.category ?? null,
      priority: addPriority,
      marginPercent: addMarginPercent.trim() ? Number(addMarginPercent) : null,
      marginCents: addMarginCents.trim() ? Math.round(Number(addMarginCents) * 100) : null,
    });
    setAdding(false);
    if (result.ok) {
      setSelectedProviderServiceId("");
      setManualProviderServiceId("");
      setAddPriority(0);
      setAddMarginPercent("");
      setAddMarginCents("");
      refresh();
    } else {
      setError(result.error);
    }
  }

  async function handleUpdateMapping(
    mapping: ServiceMappingSummary,
    patch: Partial<Pick<ServiceMappingSummary, "priority" | "enabled" | "marginPercent" | "marginCents">>,
  ) {
    setBusyId(mapping.id);
    const result = await updateServiceMappingAction(initData, kind, mapping.id, {
      providerServiceId: mapping.providerServiceId,
      providerServiceName: mapping.providerServiceName,
      providerPriceCents: mapping.providerPriceCents,
      providerEstimatedTime: mapping.providerEstimatedTime,
      providerCategory: mapping.providerCategory,
      priority: mapping.priority,
      enabled: mapping.enabled,
      marginPercent: mapping.marginPercent,
      marginCents: mapping.marginCents,
      ...patch,
    });
    setBusyId(null);
    if (result.ok) refresh();
    else setError(result.error);
  }

  async function handleApplySuggestedPrice(mapping: ServiceMappingSummary) {
    setApplyingPriceId(mapping.id);
    const result = await applySuggestedPriceAction(initData, kind, mapping.id);
    setApplyingPriceId(null);
    if (!result.ok) setError(result.error);
  }

  async function handleDelete(mapping: ServiceMappingSummary) {
    setBusyId(mapping.id);
    const result = await deleteServiceMappingAction(initData, kind, mapping.id);
    setBusyId(null);
    if (result.ok) refresh();
    else setError(result.error);
  }

  function toggleAutoMapProvider(id: string) {
    setAutoMapProviderIds((current) =>
      current.includes(id) ? current.filter((p) => p !== id) : [...current, id],
    );
  }

  async function handleAutoMap() {
    if (autoMapProviderIds.length === 0) return;
    setAutoMapping(true);
    setAutoMapSummary(null);
    const result = await autoMapServiceAction(initData, kind, falconServiceId, autoMapProviderIds);
    setAutoMapping(false);
    if (result.ok) {
      const parts = [`${result.created} mapping${result.created === 1 ? "" : "s"} created`];
      if (result.skipped.length > 0) {
        parts.push(
          `skipped: ${result.skipped.map((s) => `${s.providerName} (${s.reason})`).join(", ")}`,
        );
      }
      setAutoMapSummary(parts.join(" - "));
      refresh();
    } else {
      setAutoMapSummary(`Failed: ${result.error}`);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-background p-3 text-xs">
      <p className="font-semibold text-foreground">Provider Mappings - {falconServiceName}</p>
      {error ? <p className="text-accent">{error}</p> : null}
      {!mappings && !error ? <p className="text-hint">Loading…</p> : null}

      {routingStrategy ? (
        <label className="flex flex-col gap-1 rounded-lg border border-border bg-surface p-2">
          <span className="font-semibold text-foreground">Routing Strategy</span>
          <select
            value={routingStrategy}
            disabled={savingStrategy}
            onChange={(e) => handleStrategyChange(e.target.value as RoutingStrategy)}
            className="rounded border border-border bg-background px-2 py-1 text-foreground disabled:opacity-50"
          >
            {STRATEGY_OPTIONS.map((strategy) => (
              <option key={strategy} value={strategy}>
                {STRATEGY_LABEL[strategy]}
              </option>
            ))}
          </select>
          <span className="text-hint">
            {routingStrategy === "MANUAL"
              ? "Only the top-priority provider is used - failures are not retried automatically."
              : "If the first provider fails, the next one is retried automatically."}
          </span>
        </label>
      ) : null}

      {mappings && mappings.length === 0 ? (
        <p className="text-hint">No provider mapped yet. This service cannot be auto-routed until mapped.</p>
      ) : null}

      {mappings?.map((mapping) => (
        <div
          key={mapping.id}
          className="flex flex-col gap-1 rounded-lg border border-border bg-surface p-2"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-foreground">{mapping.providerName}</p>
            <span className={mapping.enabled ? "text-foreground" : "text-hint"}>
              {mapping.enabled ? "Enabled" : "Disabled"}
            </span>
          </div>
          <p className="text-hint">
            {mapping.providerServiceName ?? mapping.providerServiceId}
            {mapping.providerServiceName ? ` (#${mapping.providerServiceId})` : ""}
            {mapping.providerPriceCents != null ? ` · cost ${formatUsd(mapping.providerPriceCents)}` : ""}
            {mapping.providerEstimatedTime ? ` · ${mapping.providerEstimatedTime}` : ""}
            {mapping.providerCategory ? ` · ${mapping.providerCategory}` : ""}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1 text-hint">
              Priority
              <input
                type="number"
                value={mapping.priority}
                disabled={busyId === mapping.id}
                onChange={(e) => handleUpdateMapping(mapping, { priority: Number(e.target.value) })}
                className="w-14 rounded border border-border bg-background px-1 py-0.5 text-foreground"
              />
            </label>
            <button
              type="button"
              disabled={busyId === mapping.id}
              onClick={() => handleUpdateMapping(mapping, { enabled: !mapping.enabled })}
              className="rounded border border-border px-2 py-1 text-foreground disabled:opacity-50"
            >
              {mapping.enabled ? "Disable" : "Enable"}
            </button>
            <button
              type="button"
              disabled={busyId === mapping.id}
              onClick={() => handleDelete(mapping)}
              className="rounded border border-border px-2 py-1 text-accent disabled:opacity-50"
            >
              Delete
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-border pt-2">
            <label className="flex items-center gap-1 text-hint">
              Margin %
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="default"
                value={mapping.marginPercent ?? ""}
                disabled={busyId === mapping.id}
                onChange={(e) =>
                  handleUpdateMapping(mapping, {
                    marginPercent: e.target.value.trim() ? Number(e.target.value) : null,
                  })
                }
                className="w-16 rounded border border-border bg-background px-1 py-0.5 text-foreground"
              />
            </label>
            <label className="flex items-center gap-1 text-hint">
              Margin $
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="default"
                value={mapping.marginCents != null ? mapping.marginCents / 100 : ""}
                disabled={busyId === mapping.id}
                onChange={(e) =>
                  handleUpdateMapping(mapping, {
                    marginCents: e.target.value.trim() ? Math.round(Number(e.target.value) * 100) : null,
                  })
                }
                className="w-16 rounded border border-border bg-background px-1 py-0.5 text-foreground"
              />
            </label>
            {mapping.suggestedPriceCents != null ? (
              <>
                <span className="text-foreground">
                  Suggested price: {formatUsd(mapping.suggestedPriceCents)}
                </span>
                <button
                  type="button"
                  disabled={applyingPriceId === mapping.id}
                  onClick={() => handleApplySuggestedPrice(mapping)}
                  className="rounded bg-accent px-2 py-1 text-accent-foreground disabled:opacity-50"
                >
                  {applyingPriceId === mapping.id ? "Applying…" : "Apply to service price"}
                </button>
              </>
            ) : (
              <span className="text-hint">No provider price cached yet - sync to get a suggestion.</span>
            )}
          </div>
        </div>
      ))}

      <div className="flex flex-col gap-2 rounded-lg border border-dashed border-border p-2">
        <p className="font-semibold text-foreground">Add Mapping</p>
        <select
          value={selectedProviderId}
          onChange={(e) => {
            setSelectedProviderId(e.target.value);
            setCatalog(null);
            setCatalogError(null);
            setSelectedProviderServiceId("");
            setShowAllKinds(false);
          }}
          className="rounded border border-border bg-background px-2 py-1 text-foreground"
        >
          <option value="">Select a provider…</option>
          {providers?.map((provider) => (
            <option key={provider.id} value={provider.id}>
              {provider.name}
            </option>
          ))}
        </select>

        {selectedProviderId ? (
          <>
            <button
              type="button"
              disabled={loadingCatalog}
              onClick={handleBrowseCatalog}
              className="self-start rounded border border-border px-2 py-1 text-foreground disabled:opacity-50"
            >
              {loadingCatalog ? "Loading catalog…" : "Browse Provider Catalog"}
            </button>
            {catalogError ? <p className="text-accent">{catalogError}</p> : null}
            {catalog ? (
              catalog.length === 0 ? (
                <p className="text-hint">Provider returned no services.</p>
              ) : (
                <>
                  <select
                    value={selectedProviderServiceId}
                    onChange={(e) => setSelectedProviderServiceId(e.target.value)}
                    className="rounded border border-border bg-background px-2 py-1 text-foreground"
                  >
                    <option value="">
                      {visibleCatalog?.length === 0
                        ? `No ${kind} service in this catalog`
                        : "Select a service…"}
                    </option>
                    {visibleCatalog?.map((service) => (
                      <option key={service.providerServiceId} value={service.providerServiceId}>
                        {service.name}
                        {service.priceCents != null ? ` - ${formatUsd(service.priceCents)}` : ""}
                        {service.kind && service.kind !== kind ? ` [${service.kind}]` : ""}
                      </option>
                    ))}
                  </select>
                  {hiddenByKind > 0 || showAllKinds ? (
                    <label className="flex items-center gap-1 text-hint">
                      <input
                        type="checkbox"
                        checked={showAllKinds}
                        onChange={(e) => setShowAllKinds(e.target.checked)}
                      />
                      {showAllKinds
                        ? `Showing every service, including the ones this provider marks as ${kind === "IMEI" ? "Server" : "IMEI"}`
                        : `${hiddenByKind} service${hiddenByKind === 1 ? "" : "s"} hidden - the provider marks ${hiddenByKind === 1 ? "it" : "them"} as ${kind === "IMEI" ? "Server" : "IMEI"}, not ${kind}`}
                    </label>
                  ) : null}
                </>
              )
            ) : null}

            <label className="flex flex-col gap-1 text-hint">
              Or enter provider service ID manually
              <input
                type="text"
                value={manualProviderServiceId}
                onChange={(e) => setManualProviderServiceId(e.target.value)}
                placeholder="Provider service ID"
                className="rounded border border-border bg-background px-2 py-1 text-foreground"
              />
            </label>

            <label className="flex items-center gap-1 text-hint">
              Priority
              <input
                type="number"
                value={addPriority}
                onChange={(e) => setAddPriority(Number(e.target.value))}
                className="w-14 rounded border border-border bg-background px-1 py-0.5 text-foreground"
              />
            </label>
            <label className="flex items-center gap-1 text-hint">
              Margin %
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="default"
                value={addMarginPercent}
                onChange={(e) => setAddMarginPercent(e.target.value)}
                className="w-16 rounded border border-border bg-background px-1 py-0.5 text-foreground"
              />
            </label>
            <label className="flex items-center gap-1 text-hint">
              Margin $
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="default"
                value={addMarginCents}
                onChange={(e) => setAddMarginCents(e.target.value)}
                className="w-16 rounded border border-border bg-background px-1 py-0.5 text-foreground"
              />
            </label>

            <button
              type="button"
              disabled={adding || (!selectedProviderServiceId && !manualProviderServiceId.trim())}
              onClick={handleAddMapping}
              className="self-start rounded bg-accent px-3 py-1 text-accent-foreground disabled:opacity-50"
            >
              {adding ? "Adding…" : "Add Mapping"}
            </button>
          </>
        ) : null}
      </div>

      <div className="flex flex-col gap-2 rounded-lg border border-dashed border-border p-2">
        <p className="font-semibold text-foreground">Auto-Map by Name</p>
        <p className="text-hint">
          Matches this service&apos;s name against each selected provider&apos;s live catalog and maps automatically.
        </p>
        <div className="flex flex-wrap gap-2">
          {providers?.map((provider) => (
            <label key={provider.id} className="flex items-center gap-1 text-hint">
              <input
                type="checkbox"
                checked={autoMapProviderIds.includes(provider.id)}
                onChange={() => toggleAutoMapProvider(provider.id)}
              />
              {provider.name}
            </label>
          ))}
        </div>
        <button
          type="button"
          disabled={autoMapping || autoMapProviderIds.length === 0}
          onClick={handleAutoMap}
          className="self-start rounded border border-border px-2 py-1 text-foreground disabled:opacity-50"
        >
          {autoMapping ? "Auto-mapping…" : "Auto-Map Selected Providers"}
        </button>
        {autoMapSummary ? <p className="text-hint">{autoMapSummary}</p> : null}
      </div>

      <div className="flex flex-col gap-2 rounded-lg border border-dashed border-border p-2">
        <p className="font-semibold text-foreground">Routing Preview</p>
        <p className="text-hint">
          Shows the order providers would be tried in right now, given the current strategy and mappings.
        </p>
        <button
          type="button"
          disabled={loadingPlan}
          onClick={handlePreviewRouting}
          className="self-start rounded border border-border px-2 py-1 text-foreground disabled:opacity-50"
        >
          {loadingPlan ? "Computing…" : "Preview Routing Order"}
        </button>
        {planError ? <p className="text-accent">{planError}</p> : null}
        {routingPlan ? (
          routingPlan.order.length === 0 ? (
            <p className="text-hint">No enabled provider available to route to.</p>
          ) : (
            <div className="flex flex-col gap-1">
              <p className="text-hint">
                {routingPlan.fallbackEnabled
                  ? "Automatic fallback: tries each provider below in order until one succeeds."
                  : "Manual mode: only the first provider is used, no automatic fallback."}
              </p>
              <ol className="flex flex-col gap-1">
                {routingPlan.order.map((candidate, index) => (
                  <li
                    key={candidate.mappingId}
                    className="flex items-center justify-between rounded border border-border bg-surface px-2 py-1"
                  >
                    <span className="text-foreground">
                      {index + 1}. {candidate.providerName}
                    </span>
                    <span className="text-hint">
                      {candidate.priceCents != null ? formatUsd(candidate.priceCents) : "price n/a"} ·{" "}
                      {candidate.successRate != null
                        ? `${Math.round(candidate.successRate * 100)}% success`
                        : "no history"}{" "}
                      · {candidate.avgResponseMs != null ? `${candidate.avgResponseMs}ms` : "no timing"}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )
        ) : null}
      </div>
    </div>
  );
}
