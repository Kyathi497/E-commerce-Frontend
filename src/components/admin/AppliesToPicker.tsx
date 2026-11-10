"use client";

import type { AdminBundle, AdminCategory, AdminProduct, AppliesTo } from "@/lib/admin";
import { control, useLoad } from "./ui";

type Kind = AppliesTo["kind"];

// Which cart lines a coupon or offer covers: everything, or chosen products,
// categories or combos (catalog ids).
export function AppliesToPicker({ value, onChange, error }: { value: AppliesTo; onChange: (v: AppliesTo) => void; error?: string }) {
  const kind = value.kind;
  const ids = value.kind === "all" ? [] : value.ids;
  const products = useLoad<{ items: AdminProduct[] }>(kind === "products" ? "/admin/products?limit=200" : null);
  const categories = useLoad<{ items: AdminCategory[] }>(kind === "categories" ? "/admin/categories" : null);
  const bundles = useLoad<{ items: AdminBundle[] }>(kind === "bundles" ? "/admin/bundles" : null);

  const options =
    kind === "products"
      ? products.data?.items.map((p) => ({ id: p.id, name: p.name }))
      : kind === "categories"
        ? categories.data?.items.map((c) => ({ id: c.id, name: c.name }))
        : kind === "bundles"
          ? bundles.data?.items.map((b) => ({ id: b.id, name: b.name }))
          : [];

  function setKind(next: Kind) {
    onChange(next === "all" ? { kind: "all" } : { kind: next, ids: [] });
  }

  function toggle(id: string) {
    if (value.kind === "all") return;
    onChange({ kind: value.kind, ids: ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id] });
  }

  return (
    <fieldset>
      <legend className="mb-1 text-sm font-semibold text-ink">Applies to</legend>
      <select value={kind} onChange={(e) => setKind(e.target.value as Kind)} className={control(!!error)} aria-label="Applies to">
        <option value="all">The whole order</option>
        <option value="products">Chosen products</option>
        <option value="categories">Chosen categories</option>
        <option value="bundles">Chosen combos</option>
      </select>
      {kind !== "all" &&
        (options ? (
          <div className="mt-2 max-h-48 space-y-1 overflow-y-auto rounded-lg border border-line p-2">
            {options.map((o) => (
              <label key={o.id} className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-[15px] hover:bg-leaf-50">
                <input type="checkbox" checked={ids.includes(o.id)} onChange={() => toggle(o.id)} className="size-4 accent-leaf-800" />
                {o.name}
              </label>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-[13px] text-ink-mute">Loading…</p>
        ))}
      {error && <p className="mt-1 text-sm font-medium text-chilli-700">{error}</p>}
    </fieldset>
  );
}

// "All products" / "3 products" for lists.
export function describeAppliesTo(a: AppliesTo) {
  if (a.kind === "all") return "Whole order";
  const noun = { products: "product", categories: "category", bundles: "combo" }[a.kind];
  const plural = a.kind === "categories" ? "categories" : `${noun}s`;
  return `${a.ids.length} ${a.ids.length === 1 ? noun : plural}`;
}

// Server errors for nested fields come back as "appliesTo.ids" etc.
export const nestedError = (fields: Record<string, string>, prefix: string) =>
  Object.entries(fields).find(([k]) => k === prefix || k.startsWith(`${prefix}.`))?.[1];
