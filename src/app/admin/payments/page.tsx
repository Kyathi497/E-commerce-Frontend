"use client";

import Link from "next/link";
import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { api } from "@/lib/api";
import { formatINR } from "@/lib/catalog";
import { formatDateTime } from "@/lib/orders";
import type { AdminPayment } from "@/lib/admin";
import { Alert, Button, control, Loading, PageHeader, Pill, query, Table, td, useAction, useLoad } from "@/components/admin/ui";

type PaymentPage = { items: AdminPayment[]; nextCursor: string | null };

const TONE: Record<AdminPayment["status"], "good" | "warn" | "bad" | "neutral"> = {
  created: "warn",
  authorized: "warn",
  captured: "good",
  failed: "bad",
  refunded: "neutral",
  partially_refunded: "neutral",
};

export default function AdminPaymentsPage() {
  const [status, setStatus] = useState("");
  const [provider, setProvider] = useState("");
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [extra, setExtra] = useState<{ key: string; items: AdminPayment[]; cursor: string | null } | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const filters = { status, provider, q };
  const qs = query(filters);
  const { data, error, reload } = useLoad<PaymentPage>(`/admin/payments${query({ ...filters, limit: 50 })}`);
  const reconcile = useAction();
  const more = useAction();

  const mine = extra?.key === qs ? extra : null;
  const items = [...(data?.items ?? []), ...(mine?.items ?? [])];
  const cursor = mine ? mine.cursor : (data?.nextCursor ?? null);

  async function loadMore() {
    const res = await more.run(() => api<PaymentPage>(`/admin/payments${query({ ...filters, limit: 50, cursor })}`));
    if (res) setExtra({ key: qs, items: [...(mine?.items ?? []), ...res.items], cursor: res.nextCursor });
  }

  return (
    <>
      <PageHeader title="Payments">
        <Button
          kind="secondary"
          busy={reconcile.busy}
          onClick={async () => {
            const res = await reconcile.run(() => api<{ found: number }>("/admin/payments/reconcile", { method: "POST" }));
            if (res) {
              setNote(res.found ? `Checked with Razorpay: ${res.found} payment(s) updated.` : "Checked with Razorpay: nothing was out of date.");
              reload();
            }
          }}
        >
          <RefreshCw className="size-4" aria-hidden /> Check with Razorpay now
        </Button>
      </PageHeader>
      <p className="-mt-3 mb-5 max-w-[70ch] text-[15px] text-ink-soft">
        Refunds are made from an order&apos;s page. Reconciliation also runs on its own every few minutes.
      </p>

      <div className="mb-4 grid gap-3 rounded-2xl bg-leaf-50 p-4 sm:grid-cols-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setQ(search.trim());
          }}
        >
          <label htmlFor="p-q" className="mb-1 block text-sm font-semibold">
            Search
          </label>
          <input id="p-q" type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Order no. or Razorpay id" className={control()} />
        </form>
        <div>
          <label htmlFor="p-status" className="mb-1 block text-sm font-semibold">
            Status
          </label>
          <select id="p-status" value={status} onChange={(e) => setStatus(e.target.value)} className={control()}>
            <option value="">Any</option>
            {["created", "captured", "failed", "refunded", "partially_refunded"].map((s) => (
              <option key={s} value={s}>
                {s.replace("_", " ")}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="p-provider" className="mb-1 block text-sm font-semibold">
            Provider
          </label>
          <select id="p-provider" value={provider} onChange={(e) => setProvider(e.target.value)} className={control()}>
            <option value="">Any</option>
            <option value="razorpay">Razorpay</option>
            <option value="cod">Cash on delivery</option>
            <option value="test">Test mode</option>
          </select>
        </div>
      </div>

      {(note || reconcile.error) && (
        <div className="mb-4">
          <Alert kind={reconcile.error ? "error" : "ok"}>{reconcile.error ?? note}</Alert>
        </div>
      )}

      {error ? (
        <Alert>{error.error}</Alert>
      ) : !data ? (
        <Loading />
      ) : (
        <>
          <Table head={["Order", "Provider", "Status", "Amount", "Created"]} empty={items.length === 0 && "No payments match."}>
            {items.map((p) => (
              <tr key={p.id} className="hover:bg-leaf-50">
                <td className={td}>
                  <Link href={`/admin/orders/view?number=${p.orderNumber}`} className="tabular font-semibold text-leaf-800 hover:underline">
                    {p.orderNumber}
                  </Link>
                  {p.providerPaymentId && <p className="tabular text-[13px] text-ink-mute">{p.providerPaymentId}</p>}
                </td>
                <td className={td}>
                  {p.provider === "cod" ? "COD" : p.provider === "test" ? "Test" : "Razorpay"}
                  {p.method && <p className="text-[13px] text-ink-mute">{p.method}</p>}
                </td>
                <td className={td}>
                  <Pill tone={TONE[p.status]}>{p.status.replace("_", " ")}</Pill>
                  {p.failureReason && <p className="mt-1 text-[13px] text-chilli-700">{p.failureReason}</p>}
                </td>
                <td className={`${td} tabular`}>
                  {formatINR(p.amountPaise)}
                  {p.refundedPaise > 0 && <p className="text-[13px] text-ink-mute">−{formatINR(p.refundedPaise)} refunded</p>}
                </td>
                <td className={`${td} tabular text-ink-soft`}>{formatDateTime(p.createdAt)}</td>
              </tr>
            ))}
          </Table>
          {cursor && (
            <Button kind="secondary" busy={more.busy} onClick={() => void loadMore()} className="mt-4">
              Load more
            </Button>
          )}
        </>
      )}
    </>
  );
}
