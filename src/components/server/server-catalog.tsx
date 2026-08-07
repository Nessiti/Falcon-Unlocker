"use client";

import { useMemo, useState } from "react";
import { ServerServiceCard } from "@/components/server/server-service-card";
import { ServerServiceType } from "@/generated/prisma/browser";
import type { Category, ServerService, ServerServiceField } from "@/generated/prisma/client";
import { formInputClass, groupByCategory } from "@/lib/ui";

type ServiceWithRelations = ServerService & {
  category: Category | null;
  fields: ServerServiceField[];
};

const TYPE_OPTIONS: (ServerServiceType | "ALL")[] = [
  "ALL",
  ServerServiceType.LICENSE,
  ServerServiceType.ACTIVATION,
  ServerServiceType.CREDITS,
  ServerServiceType.SUBSCRIPTION,
  ServerServiceType.UNLOCK,
  ServerServiceType.FRP,
  ServerServiceType.FLASH,
  ServerServiceType.REPAIR,
];

export function ServerCatalog({
  services,
  initialCategoryId,
}: {
  services: ServiceWithRelations[];
  initialCategoryId?: string | null;
}) {
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState(initialCategoryId ?? "ALL");
  const [type, setType] = useState<ServerServiceType | "ALL">("ALL");

  const categories = useMemo(() => {
    const map = new Map<string, string>();
    for (const service of services) {
      if (service.category) map.set(service.category.id, service.category.name);
    }
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [services]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return services.filter((service) => {
      if (categoryId !== "ALL" && service.categoryId !== categoryId) return false;
      if (type !== "ALL" && service.type !== type) return false;
      if (
        query &&
        !service.name.toLowerCase().includes(query) &&
        !service.description.toLowerCase().includes(query)
      ) {
        return false;
      }
      return true;
    });
  }, [services, search, categoryId, type]);

  if (services.length === 0) {
    return <p className="text-sm text-hint">No services available yet.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="search"
          className={`${formInputClass} w-full min-w-0 sm:flex-1`}
          placeholder="Search services…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className={`${formInputClass} w-full shrink-0 sm:w-40`}
          value={type}
          onChange={(e) => setType(e.target.value as ServerServiceType | "ALL")}
        >
          {TYPE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option === "ALL" ? "All types" : option}
            </option>
          ))}
        </select>
        {categories.length > 0 ? (
          <select
            className={`${formInputClass} w-full shrink-0 sm:w-56`}
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            <option value="ALL">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        ) : null}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-hint">No services match your search.</p>
      ) : (
        <div className="flex flex-col gap-6">
          {groupByCategory(filtered).map((group) => (
            <div key={group.id} className="flex flex-col gap-3">
              <h2 className="text-base font-semibold text-foreground">{group.name}</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {group.items.map((service) => (
                  <ServerServiceCard key={service.id} service={service} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
