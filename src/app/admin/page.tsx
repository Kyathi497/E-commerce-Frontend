"use client";

import Link from "next/link";
import { formatINR } from "@/lib/catalog";
import { formatDateTime, type OrderStatus } from "@/lib/orders";
import { type AdminOrderSummary, formatQty, STATUS_NAME, type StockItem } from "@/lib/admin";
import { Alert, Card, Loading, PageHeader, Pill, Table, td, useLoad } from "@/components/admin/ui";
import { StatusBadge } from "@/components/orders/OrderParts";

type OrderPage = { items: AdminOrderSummary[]; nextCursor: string | null };

// The work waiting on the owner.
const QUEUES: { status: OrderStatus; hint: string }[] = [
  { status: "CONFIRMED", hint: "Paid or COD, not started" },
  { status: "PREPARING", hint: "Being ground and filled" },
  { status: "PACKED", hint: "Waiting for pickup" },
  { status: "RETURN_REQUESTED", hint: "Needs a decision" },
];

function QueueCard({ status, hint }: { status: OrderStatus; hint: string }) {
  const { data, error } = useLoad<OrderPage>(`/admin/orders?status=${status}&limit=100`);
  const count = data ? `${data.items.length}${data.nextCursor ? "+" : ""}` : "–";
  return (
    <Link
      href={`/admin/orders?status=${status}`}
      className="rounded-2xl border border-line bg-white p-5 transition-colors hover:border-leaf-300 hover:bg-leaf-50"
    >
      <p className="text-sm font-semibold text-ink-soft">{STATUS_NAME[status]}</p>
      <p className="tabular mt-1 font-display text-4xl font-bold text-leaf-900">{error ? "?" : count}</p>
      <p className="mt-1 text-[13px] text-ink-mute">{hint}</p>
    </Link>
  );
}

export default function AdminDashboard() {
  const recent = useLoad<OrderPage>("/admin/orders?limit=8");
  const low = useLoad<{ items: StockItem[] }>("/admin/stock?low=true&status=active");

  return (
    <>
      <PageHeader title="Dashboard" />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {QUEUES.map((q) => (
          <QueueCard key={q.status} {...q} />
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_380px]">
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-leaf-900">Latest orders</h2>
            <Link href="/admin/orders" className="text-[15px] font-semibold text-leaf-800 hover:underline">
              All orders
            </Link>
          </div>
          {recent.error ? (
            <Alert>{recent.error.error}</Alert>
          ) : !recent.data ? (
            <Loading />
          ) : (
            <Table head={["Order", "Customer", "Status", "Total"]} empty={recent.data.items.length === 0 && "No orders yet."}>
              {recent.data.items.map((o) => (
                <tr key={o.number} className="hover:bg-leaf-50">
                  <td className={td}>
                    <Link href={`/admin/orders/view?number=${o.number}`} className="tabular font-semibold text-leaf-800 hover:underline">
                      {o.number}
                    </Link>
                    <p className="text-[13px] text-ink-mute">{formatDateTime(o.placedAt)}</p>
                  </td>
                  <td className={td}>
                    {o.contact.name}
                    <p className="text-[13px] text-ink-mute">
                      {o.city} {o.pincode}
                    </p>
                  </td>
                  <td className={td}>
                    <StatusBadge status={o.status} label={STATUS_NAME[o.status]} />
                  </td>
                  <td className={`${td} tabular`}>
                    {formatINR(o.totalPaise)}
                    {o.paymentMethod === "cod" && <p className="text-[13px] text-ink-mute">COD</p>}
                  </td>
                </tr>
              ))}
            </Table>
          )}
        </div>

        <Card
          title="Running low"
          actions={
            <Link href="/admin/inventory?low=true" className="text-[15px] font-semibold text-leaf-800 hover:underline">
              Inventory
            </Link>
          }
        >
          {low.error ? (
            <Alert>{low.error.error}</Alert>
          ) : !low.data ? (
            <Loading />
          ) : low.data.items.length === 0 ? (
            <p className="text-[15px] text-ink-soft">Everything is above its low-stock level.</p>
          ) : (
            <ul className="divide-y divide-line">
              {low.data.items.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{s.name}</span>
                    <span className="tabular block text-[13px] text-ink-mute">
                      {formatQty(s.available, s.unit)} free · alert at {formatQty(s.lowStockThreshold, s.unit)}
                    </span>
                  </span>
                  <Pill tone={s.level === "out" ? "bad" : "warn"}>{s.level === "out" ? "Out" : "Low"}</Pill>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
