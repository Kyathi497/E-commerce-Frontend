"use client";

import { useState } from "react";
import type { Product } from "@/lib/catalog";
import { type ApiProduct, type ProductPage, productsPath, toProductPage } from "@/lib/catalog-api";
import { ProductCard } from "@/components/ProductCard";

// The server renders the first page; "Show more" adds the next PAGE products
// below it. Each new card asks for its own stock (StockProvider), so stock is
// only fetched for what was just loaded.
const PAGE = 10;

export function PagedProductGrid({ initial }: { initial: ProductPage }) {
  const [products, setProducts] = useState<Product[]>(initial.products);
  const [cursor, setCursor] = useState(initial.nextCursor);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  async function showMore() {
    if (!cursor || loading) return;
    setLoading(true);
    setFailed(false);
    try {
      const res = await fetch(`/api/v1${productsPath(PAGE, cursor)}`, { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const page = toProductPage((await res.json()) as { items: ApiProduct[]; nextCursor: string | null });
      setProducts((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...page.products.filter((p) => !seen.has(p.id))];
      });
      setCursor(page.nextCursor);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="mt-10 grid grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-6 sm:gap-y-12 lg:grid-cols-3">
        {products.map((p) => (
          <ProductCard key={p.slug} product={p} />
        ))}
      </div>
      {cursor && (
        <div className="mt-12 flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={showMore}
            disabled={loading}
            className="flex h-12 items-center rounded-full border-2 border-leaf-800 px-7 text-base font-semibold text-leaf-900 transition-colors hover:bg-leaf-50 disabled:cursor-wait disabled:opacity-60"
          >
            {loading ? "Loading…" : "Show more"}
          </button>
          {failed && (
            <p role="alert" className="text-[15px] text-chilli-700">
              We couldn&apos;t load more products. Please try again.
            </p>
          )}
        </div>
      )}
    </>
  );
}
