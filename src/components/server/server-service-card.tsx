import type { Category, ServerService, ServerServiceField } from "@/generated/prisma/client";

type ServiceWithRelations = ServerService & {
  category: Category | null;
  fields: ServerServiceField[];
};

const BADGE_LABEL: Record<string, string> = {
  POPULAR: "Popular",
  NEW: "New",
  FEATURED: "Featured",
};

const TYPE_LABEL: Record<string, string> = {
  LICENSE: "License",
  ACTIVATION: "Activation",
  CREDITS: "Credits",
  SUBSCRIPTION: "Subscription",
  UNLOCK: "Unlock",
  FRP: "FRP",
  FLASH: "Flash",
  REPAIR: "Repair",
};

function formatUsd(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    cents / 100,
  );
}

export function ServerServiceCard({ service }: { service: ServiceWithRelations }) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {service.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- admin-provided image URL
            <img
              src={service.imageUrl}
              alt=""
              className="h-10 w-10 rounded-lg object-cover"
            />
          ) : null}
          <div>
            <p className="text-sm font-semibold text-foreground">{service.name}</p>
            <p className="text-xs text-hint">
              {TYPE_LABEL[service.type]}
              {service.category ? ` · ${service.category.name}` : ""}
            </p>
          </div>
        </div>
        {service.badge ? (
          <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-[11px] font-medium text-accent-foreground">
            {BADGE_LABEL[service.badge]}
          </span>
        ) : null}
      </div>

      <p className="text-sm text-hint">{service.description}</p>

      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold text-foreground">{formatUsd(service.priceCents)}</span>
        <span className="text-hint">{service.estimatedTime}</span>
      </div>

      {service.fields.length > 0 ? (
        <p className="text-xs text-hint">
          Required info: {service.fields.map((field) => field.label).join(", ")}
        </p>
      ) : null}
    </div>
  );
}
