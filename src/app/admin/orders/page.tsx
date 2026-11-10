"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Download } from "lucide-react";
import { api, download } from "@/lib/api";
import { formatINR } from "@/lib/catalog";
import { formatDateTime, type OrderStatus } from "@/lib/orders";
import { type AdminOrderSummary, ORDER_STATUSES, STATUS_NAME } from "@/lib/admin";
import { Alert, Button, control, Loading, PageHeader, query, Table, td, useLoad } from "@/components/admin/ui";
import { StatusBadge } from "@/components/orders/OrderParts";

type OrderPage = { items: AdminOrderSummary[]; nextCursor: string | null };

export default function AdminOrdersPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Orders />
    </Suspense>
  );
}

// Filters live in the URL, so a filtered list can be bookmarked or shared.
function Orders() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const filters = {
    status: params.get("status") ?? "",
    paymentMethod: params.get("paymentMethod") ?? "",
    q: params.get("q") ?? "",
    pincode: params.get("pincode") ?? "",
    from: params.get("from") ?? "",
    to: params.get("to") ?? "",
  };
  // Dates are picked as IST days; the API takes instants.
  const apiFilters = {
    ...filters,
    from: filters.from && new Date(`${filters.from}T00:00:00+05:30`).toISOString(),
    to: filters.to && new Date(`${filters.to}T23:59:59.999+05:30`).toISOString(),
  };
  const qs = query(apiFilters);
  const { data, error } = useLoad<OrderPage>(`/admin/orders${query({ ...apiFilters, limit: 50 })}`);
  const [more, setMore] = useState<{ key: string; items: AdminOrderSummary[]; cursor: string | null } | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [search, setSearch] = useState(filters.q);

  // Extra pages belong to this exact filter; a new filter starts over.
  const extra = more?.key === qs ? more : null;
  const items = [...(data?.items ?? []), ...(extra?.items ?? [])];
  const cursor = extra ? extra.cursor : (data?.nextCursor ?? null);

  function set(next: Partial<typeof filters>) {
    router.replace(`${pathname}${query({ ...filters, ...next })}`);
  }

  async function loadMore() {
    if (!cursor) return;
    setLoadingMore(true);
    const res = await api<OrderPage>(`/admin/orders${query({ ...apiFilters, limit: 50, cursor })}`);
    setLoadingMore(false);
    if (res.ok) setMore({ key: qs, items: [...(extra?.items ?? []), ...res.data.items], cursor: res.data.nextCursor });
  }

  async function exportCsv() {
    setExporting(true);
    setExportError(null);
    const res = await download(`/admin/orders/export.csv${qs}`, `tej-orders-${new Date().toISOString().slice(0, 10)}.csv`);
    setExporting(false);
    if (!res.ok) setExportError(res.error.error);
  }

  return (
    <>
      <PageHeader title="Orders">
        <Button kind="secondary" busy={exporting} onClick={() => void exportCsv()}>
          <Download className="size-4" aria-hidden /> Export CSV
        </Button>
      </PageHeader>

      <div className="mb-4 grid gap-3 rounded-2xl bg-leaf-50 p-4 sm:grid-cols-2 xl:grid-cols-6">
        <form
          className="sm:col-span-2"
          onSubmit={(e) => {
            e.preventDefault();
            set({ q: search.trim() });
          }}
        >
          <label htmlFor="o-q" className="mb-1 block text-sm font-semibold">
            Search
          </label>
          <input
            id="o-q"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Order no., name, phone or email"
            className={control()}
          />
        </form>
        <div>
          <label htmlFor="o-status" className="mb-1 block text-sm font-semibold">
            Status
          </label>
          <select id="o-status" value={filters.status} onChange={(e) => set({ status: e.target.value })} className={control()}>
            <option value="">Any</option>
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_NAME[s]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="o-pay" className="mb-1 block text-sm font-semibold">
            Payment
          </label>
          <select id="o-pay" value={filters.paymentMethod} onChange={(e) => set({ paymentMethod: e.target.value })} className={control()}>
            <option value="">Any</option>
            <option value="prepaid">Prepaid</option>
            <option value="cod">Cash on delivery</option>
          </select>
        </div>
        <div>
          <label htmlFor="o-from" className="mb-1 block text-sm font-semibold">
            From
          </label>
          <input id="o-from" type="date" value={filters.from} onChange={(e) => set({ from: e.target.value })} className={control()} />
        </div>
        <div>
          <label htmlFor="o-to" className="mb-1 block text-sm font-semibold">
            To
          </label>
          <input id="o-to" type="date" value={filters.to} onChange={(e) => set({ to: e.target.value })} className={control()} />
        </div>
      </div>
      {Object.values(filters).some(Boolean) && (
        <button
          type="button"
          onClick={() => {
            setSearch("");
            router.replace(pathname);
          }}
          className="mb-4 text-[15px] font-semibold text-leaf-800 hover:underline"
        >
          Clear filters
        </button>
      )}

      {exportError && (
        <div className="mb-4">
          <Alert>{exportError}</Alert>
        </div>
      )}

      {error ? (
        <Alert>{error.error}</Alert>
      ) : !data ? (
        <Loading />
      ) : (
        <>
          <Table head={["Order", "Customer", "Items", "Status", "Total"]} empty={items.length === 0 && "No orders match these filters."}>
            {items.map((o) => (
              <tr key={o.number} className="hover:bg-leaf-50">
                <td className={td}>
                  <Link href={`/admin/orders/view?number=${o.number}`} className="tabular font-semibold text-leaf-800 hover:underline">
                    {o.number}
                  </Link>
                  <p className="tabular text-[13px] text-ink-mute">{formatDateTime(o.placedAt)}</p>
                </td>
                <td className={td}>
                  {o.contact.name}
                  <p className="tabular text-[13px] text-ink-mute">
                    {o.contact.phone} · {o.city} {o.pincode}
                  </p>
                </td>
                <td className={`${td} max-w-[280px] text-[13px] text-ink-soft`}>{o.items.join(", ")}</td>
                <td className={td}>
                  <StatusBadge status={o.status as OrderStatus} label={STATUS_NAME[o.status]} />
                </td>
                <td className={`${td} tabular whitespace-nowrap`}>
                  {formatINR(o.totalPaise)}
                  <p className="text-[13px] text-ink-mute">
                    {o.paymentMethod === "cod" ? "COD" : "Prepaid"}
                    {o.couponCode && ` · ${o.couponCode}`}
                  </p>
                </td>
              </tr>
            ))}
          </Table>
          {cursor && (
            <Button kind="secondary" busy={loadingMore} onClick={() => void loadMore()} className="mt-4">
              Load more
            </Button>
          )}
        </>
      )}
    </>
  );
}
