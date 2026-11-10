"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronRight, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { formatINR } from "@/lib/catalog";
import { formatDate, type OrderSummary } from "@/lib/orders";
import { Notice, secondaryButton, SectionTitle } from "@/components/account/AccountShell";
import { StatusBadge } from "@/components/orders/OrderParts";

interface Page {
  items: OrderSummary[];
  nextCursor: string | null;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderSummary[] | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const page = (after?: string) => api<Page>(`/orders?limit=10${after ? `&cursor=${encodeURIComponent(after)}` : ""}`);

  useEffect(() => {
    let live = true;
    void page().then((res) => {
      if (!live) return;
      if (!res.ok) return setError(res.error.error);
      setOrders(res.data.items);
      setCursor(res.data.nextCursor);
    });
    return () => {
      live = false;
    };
  }, []);

  async function more() {
    if (!cursor) return;
    setLoadingMore(true);
    const res = await page(cursor);
    setLoadingMore(false);
    if (!res.ok) return setError(res.error.error);
    setOrders((o) => [...(o ?? []), ...res.data.items]);
    setCursor(res.data.nextCursor);
  }

  return (
    <section aria-labelledby="orders-title">
      <SectionTitle>
        <span id="orders-title">Your orders</span>
      </SectionTitle>

      {error && (
        <div className="mt-6">
          <Notice kind="error">{error}</Notice>
        </div>
      )}

      {!orders && !error ? (
        <div className="mt-6 space-y-3" aria-label="Loading orders">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-[20px] bg-leaf-50" />
          ))}
        </div>
      ) : orders && orders.length === 0 ? (
        <div className="mt-6 rounded-[20px] bg-leaf-50 p-6">
          <p className="font-semibold text-ink">No orders yet.</p>
          <p className="mt-1 text-[15px] text-ink-soft">
            Everything is ground and packed fresh after you order.{" "}
            <Link href="/shop" className="font-semibold text-leaf-800 underline">
              Have a look at the shop
            </Link>
            .
          </p>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {orders?.map((o) => (
            <li key={o.number}>
              <Link
                href={`/account/orders/view?number=${encodeURIComponent(o.number)}`}
                className="group flex items-center gap-4 rounded-[20px] border border-line p-5 transition-colors hover:border-leaf-300 hover:bg-leaf-50"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="tabular font-semibold text-ink">{o.number}</span>
                    <StatusBadge status={o.status} label={o.statusLabel} />
                  </div>
                  <p className="mt-1.5 truncate text-[15px] text-ink-soft">{o.items.join(", ")}</p>
                  <p className="tabular mt-1 text-sm text-ink-mute">
                    {formatDate(o.placedAt)} · {o.itemCount} {o.itemCount === 1 ? "item" : "items"} · {formatINR(o.totalPaise)}
                    {o.paymentMethod === "cod" && " · cash on delivery"}
                  </p>
                </div>
                <ChevronRight className="size-5 shrink-0 text-ink-mute transition-transform group-hover:translate-x-0.5" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}

      {cursor && (
        <button type="button" onClick={() => void more()} disabled={loadingMore} className={`${secondaryButton} mt-6`}>
          {loadingMore && <Loader2 className="size-4 animate-spin" aria-hidden />} Show older orders
        </button>
      )}
    </section>
  );
}
