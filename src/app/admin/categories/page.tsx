"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRawInitData } from "@telegram-apps/sdk-react";
import {
  listCategoriesAction,
  createCategoryAction,
  deleteCategoryAction,
  type CategorySummary,
} from "@/lib/actions/admin-categories";
import { formInputClass } from "@/lib/ui";

export default function AdminCategoriesPage() {
  const initData = useRawInitData();
  const [categories, setCategories] = useState<CategorySummary[] | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function refresh() {
    if (!initData) return;
    listCategoriesAction(initData).then((result) => {
      if (result.ok) setCategories(result.categories);
      else setError(result.error);
    });
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initData]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!initData) return;

    setSubmitting(true);
    setError(null);
    const result = await createCategoryAction(initData, name);
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    setName("");
    refresh();
  }

  async function handleDelete(id: string) {
    if (!initData) return;
    const result = await deleteCategoryAction(initData, id);
    if (result.ok) refresh();
  }

  if (!initData) return null;

  return (
    <div className="flex flex-col gap-4">
      <form
        onSubmit={handleSubmit}
        className="flex gap-2 rounded-2xl border border-border bg-surface p-4"
      >
        <input
          className={`${formInputClass} flex-1`}
          placeholder="Category name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-foreground disabled:opacity-50"
        >
          Add
        </button>
      </form>

      {error ? <p className="text-sm text-accent">{error}</p> : null}
      {categories && categories.length === 0 ? (
        <p className="text-sm text-hint">No categories yet.</p>
      ) : null}

      <div className="flex flex-col gap-2">
        {categories?.map((category) => (
          <div
            key={category.id}
            className="flex items-center justify-between rounded-2xl border border-border bg-surface p-4 text-sm"
          >
            <div>
              <p className="text-foreground">{category.name}</p>
              <p className="text-xs text-hint">
                {category.imeiCount} IMEI · {category.serverCount} Server
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleDelete(category.id)}
              className="rounded-lg border border-border px-2 py-1 text-xs text-accent"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
