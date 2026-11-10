"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { ArrowLeft, Loader2, RotateCcw } from "lucide-react";
import { api } from "@/lib/api";
import { STORE } from "@/lib/catalog";
import { addressLines, formatDateTime, type OrderDetail } from "@/lib/orders";
import { useCart } from "@/components/cart/CartProvider";
import { Notice, primaryButton, secondaryButton } from "@/components/account/AccountShell";
import { OrderItems, OrderProgress, OrderTotalsList, StatusBadge } from "@/components/orders/OrderParts";
import { WhatsAppIcon } from "@/components/icons";

export default function OrderPage() {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-[24px] bg-leaf-50" aria-label="Loading order" />}>
      <Order />
    </Suspense>
  );
}

function Order() {
  const number = useSearchParams().get("number") ?? "";
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [error, setError] = useState<{ status: number; text: string } | null>(null);

  useEffect(() => {
    if (!number) return;
    let live = true;
    void api<{ order: OrderDetail }>(`/orders/${encodeURIComponent(number)}`).then((res) => {
      if (!live) return;
      if (res.ok) setOrder(res.data.order);
      else setError({ status: res.status, text: res.error.error });
    });
    return () => {
      live = false;
    };
  }, [number]);

  const back = (
    <Link href="/account/orders" className="inline-flex items-center gap-1.5 text-[15px] font-semibold text-leaf-800 hover:underline">
      <ArrowLeft className="size-4" aria-hidden /> All orders
    </Link>
  );

  if (error || !number) {
    return (
      <div>
        {back}
        <div className="mt-6">
          <Notice kind="error">{!error || error.status === 404 ? "We couldn't find that order on your account." : error.text}</Notice>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div>
        {back}
        <div className="mt-6 h-96 animate-pulse rounded-[24px] bg-leaf-50" aria-label="Loading order" />
      </div>
    );
  }

  return (
    <div>
      {back}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <h2 className="tabular font-display text-2xl font-bold text-leaf-900 sm:text-3xl">{order.number}</h2>
        <StatusBadge status={order.status} label={order.statusLabel} />
      </div>
      <p className="mt-1 text-[15px] text-ink-mute">
        Placed {formatDateTime(order.placedAt)} · {order.paymentMethod === "cod" ? "Cash on delivery" : "Paid online"}
      </p>

      <StatusNote order={order} />

      <section aria-label="Progress" className="mt-8 rounded-[24px] border border-line p-5 sm:p-6">
        <OrderProgress order={order} />
      </section>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_300px]">
        <section aria-labelledby="items-title">
          <h3 id="items-title" className="font-display text-xl font-bold text-leaf-900">
            Items
          </h3>
          <div className="mt-2">
            <OrderItems items={order.items} />
          </div>
          <div className="mt-4 rounded-[20px] bg-leaf-50 p-5">
            <OrderTotalsList order={order} />
          </div>
        </section>

        <aside className="space-y-6">
          {order.shippingAddress && (
            <section aria-labelledby="ship-title">
              <h3 id="ship-title" className="font-display text-lg font-bold text-leaf-900">
                Delivering to
              </h3>
              <p className="mt-2 font-semibold text-ink">{order.shippingAddress.name}</p>
              {order.contact && <p className="tabular text-[15px] text-ink-soft">{order.contact.phone}</p>}
              <p className="mt-1 text-[15px] leading-snug text-ink-soft">
                {addressLines(order.shippingAddress).map((l) => (
                  <span key={l} className="block">
                    {l}
                  </span>
                ))}
              </p>
            </section>
          )}
          <Actions order={order} onChange={setOrder} />
        </aside>
      </div>
    </div>
  );
}

function StatusNote({ order }: { order: OrderDetail }) {
  const text: Partial<Record<OrderDetail["status"], string>> = {
    PENDING_PAYMENT:
      "We're waiting for your payment to be confirmed. If money left your account, the order confirms by itself, or the money is refunded.",
    CANCELLED:
      order.paymentMethod === "cod" || !order.confirmedAt
        ? "This order was cancelled. You weren't charged."
        : "This order was cancelled. Any payment is refunded to the way you paid.",
    REFUND_PENDING: "Your refund is on its way. It usually reaches you in 5–7 working days.",
    REFUNDED: "Refunded to the way you paid.",
    RETURN_REQUESTED: "We've got your return request and will be in touch on WhatsApp.",
    RTO: "The courier couldn't deliver this order and it's coming back to us. We'll contact you.",
  };
  const note = text[order.status];
  if (!note) return null;
  return <p className="mt-5 max-w-[65ch] rounded-xl bg-turmeric-100 px-4 py-3 text-[15px] text-ink-soft">{note}</p>;
}

function Actions({ order, onChange }: { order: OrderDetail; onChange: (o: OrderDetail) => void }) {
  const { add, setOpen } = useCart();
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState<"cancel" | "reorder" | null>(null);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  async function cancel(e: React.FormEvent) {
    e.preventDefault();
    setBusy("cancel");
    setMessage(null);
    const res = await api<{ order: OrderDetail }>(`/orders/${encodeURIComponent(order.number)}/cancel`, {
      method: "POST",
      body: reason.trim() ? { reason: reason.trim() } : {},
    });
    setBusy(null);
    if (!res.ok) return setMessage({ kind: "error", text: res.error.error });
    setCancelling(false);
    onChange(res.data.order);
    setMessage({ kind: "ok", text: "Your order is cancelled." });
  }

  // Puts the same items back in the cart, at today's prices.
  async function reorder() {
    setBusy("reorder");
    setMessage(null);
    const missed: string[] = [];
    for (const i of order.items) {
      const r = await add(i.kind === "sku" ? { kind: "product", sku: i.ref, qty: i.qty } : { kind: "combo", slug: i.ref, qty: i.qty });
      if (!r.ok) missed.push(i.name);
    }
    setBusy(null);
    if (missed.length === order.items.length) {
      return setMessage({ kind: "error", text: "None of these items can be added right now. They may be sold out or no longer sold." });
    }
    if (missed.length) setMessage({ kind: "error", text: `Added to your cart, except: ${missed.join(", ")}.` });
    setOpen(true);
  }

  const whatsappText = `Hi Tej Organics, I have a question about order ${order.number}.`;

  return (
    <section aria-label="Order actions" className="space-y-3">
      {message && <Notice kind={message.kind}>{message.text}</Notice>}

      {order.status !== "PENDING_PAYMENT" && (
        <button type="button" onClick={() => void reorder()} disabled={busy !== null} className={`${primaryButton} w-full`}>
          {busy === "reorder" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <RotateCcw className="size-4" aria-hidden />}
          Order these again
        </button>
      )}

      <a
        href={`https://wa.me/${STORE.whatsapp}?text=${encodeURIComponent(whatsappText)}`}
        className={`${secondaryButton} w-full`}
      >
        <WhatsAppIcon className="size-5" /> {order.status === "DELIVERED" ? "Problem with your order?" : "Ask about this order"}
      </a>

      {order.canCancel &&
        (cancelling ? (
          <form onSubmit={cancel} className="space-y-3 rounded-[20px] border-2 border-chilli-100 p-4">
            <p className="font-semibold text-ink">Cancel this order?</p>
            <p className="text-sm text-ink-soft">
              {order.paymentMethod === "prepaid" && order.confirmedAt
                ? "Your payment will be refunded in full to the way you paid."
                : "Nothing will be charged."}
            </p>
            <label htmlFor="cancel-reason" className="block text-sm font-semibold text-ink">
              Reason <span className="font-normal text-ink-mute">(optional)</span>
            </label>
            <textarea
              id="cancel-reason"
              rows={2}
              maxLength={300}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="block w-full rounded-xl border border-line px-3 py-2 text-[15px] focus:border-leaf-700 focus:outline-none focus:ring-2 focus:ring-leaf-200"
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={busy !== null}
                className="inline-flex h-11 items-center gap-2 rounded-full bg-chilli-700 px-4 font-semibold text-white disabled:opacity-60"
              >
                {busy === "cancel" && <Loader2 className="size-4 animate-spin" aria-hidden />} Cancel order
              </button>
              <button type="button" onClick={() => setCancelling(false)} className="h-11 rounded-full px-4 font-semibold text-leaf-900 hover:bg-leaf-50">
                Keep it
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setCancelling(true)}
            className="h-11 w-full rounded-full font-semibold text-chilli-700 hover:bg-chilli-100"
          >
            Cancel order
          </button>
        ))}
      {order.canCancel && !cancelling && (
        <p className="text-center text-[13px] text-ink-mute">You can cancel until your order is packed.</p>
      )}
    </section>
  );
}
