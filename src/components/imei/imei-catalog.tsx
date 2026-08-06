"use client";

import { useMemo, useState } from "react";
import { ImeiServiceCard } from "@/components/imei/imei-service-card";
import type { Category, ImeiService, ImeiServiceField } from "@/generated/prisma/client";
import { formInputClass } from "@/lib/ui";

type ServiceWithRelations = ImeiService & {
  category: Category | null;
  fields: ImeiServiceField[];
};

export function ImeiCatalog({ services }: { services: ServiceWithRelations[] }) {
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("ALL");

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
      if (
        query &&
        !service.name.toLowerCase().includes(query) &&
        !service.description.toLowerCase().includes(query)
      ) {
        return false;
      }
      return true;
    });
  }, [services, search, categoryId]);

  if (services.length === 0) {
    return <p className="text-sm text-hint">No services available yet.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          className={`${formInputClass} sm:flex-1`}
          placeholder="Search services…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {categories.length > 0 ? (
          <select
            className={formInputClass}
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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((service) => (
            <ImeiServiceCard key={service.id} service={service} />
          ))}
        </div>
      )}
    </div>
  );
}
