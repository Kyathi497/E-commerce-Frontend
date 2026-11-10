"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useRef, useState } from "react";
import { api } from "@/lib/api";
import { formatINR } from "@/lib/catalog";
import { addressLines, formatDateTime } from "@/lib/orders";
import {
  ADMIN_CANCELLABLE,
  ADMIN_MOVES,
  type AdminOrder,
  type AdminPayment,
  paiseToRupees,
  rupeesToPaise,
  STATUS_NAME,
} from "@/lib/admin";
import { Alert, Button, Card, control, Field, FieldScope, Loading, PageHeader, Pill, useAction, useLoad } from "@/components/admin/ui";
import { OrderTotalsList, StatusBadge } from "@/components/orders/OrderParts";

export default function AdminOrderPage() {
  return (
    <Suspense fallback={<Loading />}>
      <AdminOrderView />
    </Suspense>
  );
}

function AdminOrderView() {
  const number = useSearchParams().get("number") ?? "";
  const { data, error, reload, setData } = useLoad<{ order: AdminOrder }>(number ? `/admin/orders/${encodeURIComponent(number)}` : null);
  const back = { href: "/admin/orders", label: "Orders" };

  if (!number || error) {
    return (
      <>
        <PageHeader title="Order" back={back} />
        <Alert>{error?.error ?? "No order number given."}</Alert>
      </>
    );
  }
  if (!data) return <Loading />;

  const o = data.order;
  const update = (order: AdminOrder) => setData({ order });

  return (
    <>
      <PageHeader
        back={back}
        title={
          <span className="flex flex-wrap items-center gap-3">
            <span className="tabular">{o.number}</span>
            <StatusBadge status={o.status} label={STATUS_NAME[o.status]} />
          </span>
        }
      />
      <p className="-mt-4 mb-6 text-[15px] text-ink-mute">
        Placed {formatDateTime(o.placedAt)} · {o.paymentMethod === "cod" ? "Cash on delivery" : "Prepaid"}
        {o.cancelReason && ` · cancelled (${o.cancelReason})`}
      </p>

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <StatusActions order={o} onChange={update} onConflict={reload} />

          <Card title="Items">
            <ul className="divide-y divide-line">
              {o.items.map((i, n) => (
                <li key={`${i.ref}-${n}`} className="flex items-start justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="font-semibold">
                      {i.qty} × {i.name} <span className="font-normal text-ink-soft">({i.detail})</span>
                    </p>
                    <p className="tabular text-[13px] text-ink-mute">
                      {i.ref} · HSN {i.hsnCode ?? "–"} · GST {i.gstRateBp / 100}% · {formatINR(i.unitPaise)} each
                      {i.discountPaise > 0 && ` · −${formatINR(i.discountPaise)}`}
                    </p>
                    {i.components && i.components.length > 0 && (
                      <p className="mt-1 text-[13px] text-ink-soft">In the box: {i.components.map((c) => c.label ?? c.name).join(", ")}</p>
                    )}
                  </div>
                  <p className="tabular shrink-0 font-semibold">{formatINR(i.lineTotalPaise - i.discountPaise)}</p>
                </li>
              ))}
            </ul>
            <div className="mt-4 border-t border-line pt-4 sm:ml-auto sm:max-w-sm">
              <OrderTotalsList order={o} />
              {o.placeOfSupply && <p className="mt-1 text-[13px] text-ink-mute">Place of supply: {o.placeOfSupply}</p>}
            </div>
          </Card>

          <History order={o} onChange={update} />
        </div>

        <div className="space-y-6">
          <Card title="Customer">
            <p className="font-semibold">{o.contact.name}</p>
            <p className="tabular text-[15px] text-ink-soft">
              <a href={`tel:+91${o.contact.phone}`} className="hover:underline">
                {o.contact.phone}
              </a>
            </p>
            {o.contact.email && <p className="text-[15px] text-ink-soft">{o.contact.email}</p>}
            <p className="mt-2 text-[13px] text-ink-mute">
              {o.userId ? (
                <Link href={`/admin/customers/view?id=${o.userId}`} className="font-semibold text-leaf-800 hover:underline">
                  View account
                </Link>
              ) : (
                "Guest checkout"
              )}
            </p>
            <h3 className="mt-4 text-sm font-semibold text-ink-mute">Ship to</h3>
            <p className="mt-1 text-[15px] leading-snug">
              {o.shippingAddress.name}
              {addressLines(o.shippingAddress).map((l) => (
                <span key={l} className="block text-ink-soft">
                  {l}
                </span>
              ))}
            </p>
            {o.customerNote && (
              <p className="mt-3 rounded-lg bg-turmeric-100 px-3 py-2 text-[15px]">
                <span className="font-semibold">Customer note:</span> {o.customerNote}
              </p>
            )}
          </Card>

          <PaymentCard order={o} onChange={reload} />
        </div>
      </div>
    </>
  );
}

function StatusActions({ order, onChange, onConflict }: { order: AdminOrder; onChange: (o: AdminOrder) => void; onConflict: () => void }) {
  const moves = ADMIN_MOVES[order.status] ?? [];
  const canCancel = ADMIN_CANCELLABLE.includes(order.status);
  const [reason, setReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const action = useAction();

  if (!moves.length && !canCancel) return null;

  async function move(status: string) {
    const res = await action.run(() =>
      api<{ order: AdminOrder }>(`/admin/orders/${order.number}/status`, {
        method: "POST",
        body: { status, version: order.version, ...(reason.trim() && { reason: reason.trim() }) },
      }),
    );
    if (res) {
      setReason("");
      onChange(res.order);
    }
  }

  async function cancel(e: React.FormEvent) {
    e.preventDefault();
    const res = await action.run(() =>
      api<{ order: AdminOrder }>(`/admin/orders/${order.number}/cancel`, {
        method: "POST",
        body: { reason: reason.trim(), version: order.version },
      }),
    );
    if (res) {
      setReason("");
      setCancelling(false);
      onChange(res.order);
    }
  }

  return (
    <Card title="Move this order">
      {cancelling ? (
        <form onSubmit={cancel} className="space-y-3">
          <p className="text-[15px] text-ink-soft">
            Stock and any coupon are released.{" "}
            {order.paymentMethod === "prepaid" && order.confirmedAt
              ? "The payment is refunded in full automatically."
              : "Nothing was charged."}
          </p>
          <Field label="Reason (the customer doesn't see this)" name="reason" errors={action.fields}>
            {(p) => <input {...p} value={reason} onChange={(e) => setReason(e.target.value)} />}
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" kind="danger" busy={action.busy}>
              Cancel order
            </Button>
            <Button kind="ghost" onClick={() => setCancelling(false)}>
              Back
            </Button>
          </div>
        </form>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {moves.map((s) => (
              <Button key={s} kind={s === "RTO" || s === "RETURN_REQUESTED" ? "secondary" : "primary"} busy={action.busy} onClick={() => void move(s)}>
                Mark {STATUS_NAME[s].toLowerCase()}
              </Button>
            ))}
            {canCancel && (
              <Button kind="ghost" className="text-chilli-700" onClick={() => setCancelling(true)}>
                Cancel order…
              </Button>
            )}
          </div>
          {moves.length > 0 && (
            <div className="mt-3 max-w-md">
              <label htmlFor="move-reason" className="mb-1 block text-sm font-semibold">
                Note for the history <span className="font-normal text-ink-mute">(optional)</span>
              </label>
              <input id="move-reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} className={control()} />
            </div>
          )}
        </>
      )}
      {action.error && (
        <div className="mt-3">
          <Alert>
            {action.error}{" "}
            <button type="button" onClick={onConflict} className="underline">
              Reload
            </button>
          </Alert>
        </div>
      )}
    </Card>
  );
}

function History({ order, onChange }: { order: AdminOrder; onChange: (o: AdminOrder) => void }) {
  const [note, setNote] = useState("");
  const action = useAction();

  async function addNote(e: React.FormEvent) {
    e.preventDefault();
    const res = await action.run(() =>
      api<{ order: AdminOrder }>(`/admin/orders/${order.number}/notes`, { method: "POST", body: { body: note } }),
    );
    if (res) {
      setNote("");
      onChange(res.order);
    }
  }

  // Status changes and notes, in one timeline.
  const entries = [
    ...order.history.map((h) => ({
      at: h.at,
      kind: "status" as const,
      text: `${h.from ? `${STATUS_NAME[h.from]} → ` : ""}${STATUS_NAME[h.to]}`,
      sub: [actorName(h.actor), h.reason].filter(Boolean).join(" · "),
    })),
    ...order.notes.map((n) => ({ at: n.at, kind: "note" as const, text: n.body, sub: n.kind === "internal" ? "Internal note" : n.kind })),
  ].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  return (
    <Card title="History and notes">
      <ol className="space-y-3">
        {entries.map((e, i) => (
          <li key={i} className="flex gap-3">
            <span className={`mt-2 size-2 shrink-0 rounded-full ${e.kind === "status" ? "bg-leaf-700" : "bg-turmeric-500"}`} aria-hidden />
            <div className="min-w-0">
              <p className={e.kind === "status" ? "font-semibold" : "whitespace-pre-line"}>{e.text}</p>
              <p className="tabular text-[13px] text-ink-mute">
                {formatDateTime(e.at)}
                {e.sub && ` · ${e.sub}`}
              </p>
            </div>
          </li>
        ))}
      </ol>
      <form onSubmit={addNote} className="mt-5 space-y-2">
        <label htmlFor="note" className="block text-sm font-semibold">
          Add an internal note
        </label>
        <textarea
          id="note"
          rows={2}
          maxLength={1000}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className={`${control()} h-auto py-2`}
        />
        {action.error && <Alert>{action.error}</Alert>}
        <Button type="submit" kind="secondary" busy={action.busy} disabled={!note.trim()}>
          Add note
        </Button>
      </form>
    </Card>
  );
}

function actorName(actor: string) {
  if (actor.startsWith("admin:")) return "Admin";
  return { system: "System", customer: "Customer", guest: "Guest", payment: "Payment" }[actor] ?? actor;
}

const PAYMENT_TONE: Record<AdminPayment["status"], "good" | "warn" | "bad" | "neutral"> = {
  created: "warn",
  authorized: "warn",
  captured: "good",
  failed: "bad",
  refunded: "neutral",
  partially_refunded: "neutral",
};

function PaymentCard({ order, onChange }: { order: AdminOrder; onChange: () => void }) {
  const p = order.payment;
  if (p && "unavailable" in p) {
    return (
      <Card title="Payment">
        <Alert kind="info">The payment service didn&apos;t answer. Reload in a moment.</Alert>
      </Card>
    );
  }
  if (!p) {
    return (
      <Card title="Payment">
        <p className="text-[15px] text-ink-soft">No payment recorded yet.</p>
      </Card>
    );
  }
  return (
    <Card title="Payment" actions={<Pill tone={PAYMENT_TONE[p.status]}>{p.status.replace("_", " ")}</Pill>}>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[15px]">
        <dt className="text-ink-mute">Provider</dt>
        <dd>
          {p.provider === "cod" ? "Cash on delivery" : p.provider === "test" ? "Test mode" : "Razorpay"}
          {p.method && ` · ${p.method}`}
        </dd>
        <dt className="text-ink-mute">Amount</dt>
        <dd className="tabular">{formatINR(p.amountPaise)}</dd>
        {p.refundedPaise > 0 && (
          <>
            <dt className="text-ink-mute">Refunded</dt>
            <dd className="tabular">{formatINR(p.refundedPaise)}</dd>
          </>
        )}
        {p.providerPaymentId && (
          <>
            <dt className="text-ink-mute">Payment id</dt>
            <dd className="tabular break-all text-[13px]">{p.providerPaymentId}</dd>
          </>
        )}
        {p.capturedAt && (
          <>
            <dt className="text-ink-mute">Captured</dt>
            <dd className="tabular">{formatDateTime(p.capturedAt)}</dd>
          </>
        )}
        {p.failureReason && (
          <>
            <dt className="text-ink-mute">Failure</dt>
            <dd>{p.failureReason}</dd>
          </>
        )}
      </dl>

      {p.refunds && p.refunds.length > 0 && (
        <ul className="mt-4 space-y-2 border-t border-line pt-3 text-[15px]">
          {p.refunds.map((r) => (
            <li key={r.id}>
              <span className="tabular font-semibold">{formatINR(r.amountPaise)}</span> refund · {r.status}
              <span className="block text-[13px] text-ink-mute">
                {formatDateTime(r.createdAt)} · {r.reason}
                {r.failureReason && ` · ${r.failureReason}`}
              </span>
            </li>
          ))}
        </ul>
      )}

      {p.provider === "cod" && p.status === "created" && order.status === "DELIVERED" && <CodCollected paymentId={p.id} onDone={onChange} />}
      {(p.status === "captured" || p.status === "partially_refunded") && <RefundForm payment={p} onDone={onChange} />}
    </Card>
  );
}

function CodCollected({ paymentId, onDone }: { paymentId: string; onDone: () => void }) {
  const action = useAction();
  return (
    <div className="mt-4 border-t border-line pt-4">
      <Button
        kind="secondary"
        busy={action.busy}
        onClick={async () => {
          if (await action.run(() => api(`/admin/payments/${paymentId}/cod-collected`, { method: "POST" }))) onDone();
        }}
      >
        Mark cash collected
      </Button>
      {action.error && (
        <div className="mt-2">
          <Alert>{action.error}</Alert>
        </div>
      )}
    </div>
  );
}

function RefundForm({ payment, onDone }: { payment: AdminPayment; onDone: () => void }) {
  const left = payment.amountPaise - payment.refundedPaise;
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [done, setDone] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const action = useAction();
  // One key per refund the admin means to make: a retry after a network
  // error can't refund twice. Changing the amount or reason starts a new one.
  const key = useRef<{ sig: string; value: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const paise = amount.trim() ? rupeesToPaise(amount) : null;
    if (amount.trim() && (paise === null || paise < 1 || paise > left)) {
      action.reset();
      setDone(null);
      return setLocalError(`Enter an amount up to ₹${paiseToRupees(left)}, or leave it empty for the full ${formatINR(left)}.`);
    }
    setLocalError(null);
    const sig = `${paise ?? "full"}|${reason.trim()}`;
    if (key.current?.sig !== sig) key.current = { sig, value: crypto.randomUUID() };
    const res = await action.run(() =>
      api(`/admin/payments/${payment.id}/refunds`, {
        method: "POST",
        headers: { "Idempotency-Key": key.current!.value },
        body: { ...(paise !== null && { amountPaise: paise }), reason },
      }),
    );
    if (res) {
      key.current = null;
      setOpen(false);
      setAmount("");
      setReason("");
      setDone("Refund started. Razorpay usually settles it within 5–7 working days.");
      onDone();
    }
  }

  if (left <= 0) return null;

  return (
    <div className="mt-4 border-t border-line pt-4">
      {done && (
        <div className="mb-3">
          <Alert kind="ok">{done}</Alert>
        </div>
      )}
      {open ? (
        <FieldScope id="refund">
        <form onSubmit={submit} className="space-y-3">
          <Field label={`Amount in ₹ (empty = full ${formatINR(left)})`} name="amountPaise" errors={action.fields}>
            {(p) => <input {...p} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />}
          </Field>
          <Field label="Reason" name="reason" errors={action.fields}>
            {(p) => <input {...p} value={reason} onChange={(e) => setReason(e.target.value)} />}
          </Field>
          {(localError || action.error) && <Alert>{localError ?? action.error}</Alert>}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" kind="danger" busy={action.busy}>
              Refund {amount.trim() ? `₹${amount.trim()}` : formatINR(left)}
            </Button>
            <Button kind="ghost" onClick={() => setOpen(false)}>
              Back
            </Button>
          </div>
        </form>
        </FieldScope>
      ) : (
        <Button kind="secondary" onClick={() => setOpen(true)}>
          Refund…
        </Button>
      )}
    </div>
  );
}
