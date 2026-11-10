"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { CircleAlert, CircleCheck, Loader2 } from "lucide-react";
import { formatINR, STORE } from "@/lib/catalog";
import { api } from "@/lib/api";
import { StageStrip } from "@/components/StageStrip";
import { WhatsAppIcon } from "@/components/icons";

// order-service GET /orders/:number.
interface Order {
  number: string;
  status: string;
  statusLabel: string;
  paymentMethod: "prepaid" | "cod";
  totals: { subtotalPaise: number; discountPaise: number; shippingPaise: number; taxPaise: number; totalPaise: number };
  items: { name: string; detail: string; qty: number; lineTotalPaise: number }[];
  shippingAddress: { name: string; line1: string; city: string; state: string; pincode: string };
  contact: { name: string; phone: string; email: string | null };
}

const WAITING = "PENDING_PAYMENT";
const POLL_MS = 2500;
// After this long, say so instead of spinning forever.
const PATIENCE_MS = 90_000;

export default function OrderConfirmedPage() {
  return (
    <Suspense fallback={<Waiting />}>
      <OrderConfirmed />
    </Suspense>
  );
}

// The guest link token saved at checkout, if it belongs to this order.
function linkToken(number: string) {
  try {
    const saved = JSON.parse(sessionStorage.getItem("tej-last-order") ?? "null") as { number?: string; token?: string } | null;
    return saved?.number === number ? saved.token : undefined;
  } catch {
    return undefined;
  }
}

function OrderConfirmed() {
  const number = useSearchParams().get("number") ?? "";
  const [order, setOrder] = useState<Order | null>(null);
  const [missing, setMissing] = useState(false);
  const [slow, setSlow] = useState(false);

  // Follows the order until the payment is confirmed (Razorpay's report
  // usually lands within seconds of paying).
  useEffect(() => {
    if (!number) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const started = Date.now();
    const token = linkToken(number);
    const load = async () => {
      const res = await api<{ order: Order }>(`/orders/${encodeURIComponent(number)}${token ? `?t=${encodeURIComponent(token)}` : ""}`);
      if (stopped) return;
      if (!res.ok) {
        if (res.status === 404) setMissing(true);
        else timer = setTimeout(load, POLL_MS);
        return;
      }
      setOrder(res.data.order);
      if (res.data.order.status === WAITING) {
        if (Date.now() - started > PATIENCE_MS) setSlow(true);
        timer = setTimeout(load, POLL_MS);
      }
    };
    void load();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [number]);

  if (!number || missing) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <h1 className="font-display text-3xl font-bold text-leaf-900">We couldn&apos;t find that order</h1>
        <p className="mt-2 text-ink-soft">
          If you paid and don&apos;t see a confirmation, message us on WhatsApp with your order number and we&apos;ll check
          it for you.
        </p>
        <Link href="/shop" className="mt-6 inline-flex rounded-full bg-turmeric-500 px-6 py-3 font-semibold text-leaf-950">
          Back to shop
        </Link>
      </div>
    );
  }

  if (!order) return <Waiting />;

  const whatsappText = `Hi Tej Organics, I placed order ${order.number}.`;
  const firstName = order.contact.name.split(" ")[0];
  const waiting = order.status === WAITING;
  const ended = ["CANCELLED", "REFUND_PENDING", "REFUNDED"].includes(order.status);

  return (
    <div className="mx-auto max-w-5xl px-4 pt-12 sm:px-6 lg:pt-16">
      {waiting ? (
        <>
          <Loader2 className="size-14 animate-spin text-leaf-700" strokeWidth={1.6} aria-hidden />
          <h1 className="mt-4 font-display text-4xl font-extrabold tracking-[-0.03em] text-leaf-900 sm:text-5xl">
            Confirming your payment…
          </h1>
          <p className="mt-3 max-w-[60ch] text-[17px] text-ink-soft" role="status">
            {slow
              ? "This is taking longer than usual. If money left your account, your order will be confirmed automatically, or the money refunded. You can safely close this page."
              : "This usually takes a few seconds. Please keep this page open."}
          </p>
        </>
      ) : ended ? (
        <>
          <CircleAlert className="size-14 text-chilli-700" strokeWidth={1.6} aria-hidden />
          <h1 className="mt-4 font-display text-4xl font-extrabold tracking-[-0.03em] text-leaf-900 sm:text-5xl">
            Order {order.statusLabel.toLowerCase()}
          </h1>
          <p className="mt-3 max-w-[60ch] text-[17px] text-ink-soft">
            {order.status === "CANCELLED"
              ? "This order was cancelled and you were not charged."
              : "Your payment is being refunded to the way you paid. Refunds usually reach you in 5–7 working days."}
          </p>
        </>
      ) : (
        <>
          <CircleCheck className="size-14 text-leaf-700" strokeWidth={1.6} aria-hidden />
          <h1 className="mt-4 font-display text-4xl font-extrabold tracking-[-0.03em] text-leaf-900 sm:text-5xl">
            Thank you, {firstName}. Your order is in.
          </h1>
          <p className="mt-3 max-w-[60ch] text-[17px] text-ink-soft">
            We&apos;ll now prepare everything fresh, pack it with care and send it straight to you. We&apos;ll contact you on{" "}
            {order.contact.phone} about delivery.
          </p>
        </>
      )}

      <dl className="mt-8 grid gap-4 rounded-[24px] bg-leaf-50 p-6 sm:grid-cols-3">
        <div>
          <dt className="text-sm text-ink-mute">Order number</dt>
          <dd className="tabular mt-0.5 font-semibold">{order.number}</dd>
        </div>
        <div>
          <dt className="text-sm text-ink-mute">Status</dt>
          <dd className="mt-0.5 font-semibold">{order.statusLabel}</dd>
        </div>
        <div>
          <dt className="text-sm text-ink-mute">{order.paymentMethod === "cod" ? "To pay on delivery" : "Total"}</dt>
          <dd className="tabular mt-0.5 font-semibold">{formatINR(order.totals.totalPaise)}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-sm text-ink-mute">Items</dt>
          <dd className="mt-0.5">
            <ul>
              {order.items.map((i) => (
                <li key={`${i.name}-${i.detail}`}>
                  {i.qty} × {i.name} ({i.detail})
                </li>
              ))}
            </ul>
          </dd>
        </div>
        <div>
          <dt className="text-sm text-ink-mute">Delivering to</dt>
          <dd className="mt-0.5">
            {order.shippingAddress.name}, {order.shippingAddress.line1}, {order.shippingAddress.city}, {order.shippingAddress.state}{" "}
            {order.shippingAddress.pincode}
          </dd>
        </div>
      </dl>

      {!waiting && !ended && (
        <>
          <h2 className="mt-14 font-display text-2xl font-bold text-leaf-900">What happens next</h2>
          <div className="mt-8">
            <StageStrip />
          </div>
        </>
      )}

      <div className="mt-14 flex flex-wrap gap-3">
        <a
          href={`https://wa.me/${STORE.whatsapp}?text=${encodeURIComponent(whatsappText)}`}
          className="flex h-12 items-center gap-2 rounded-full bg-leaf-800 px-5 font-semibold text-white hover:bg-leaf-900"
        >
          <WhatsAppIcon className="size-5" /> Message us about this order
        </a>
        <Link href="/shop" className="flex h-12 items-center rounded-full border-2 border-leaf-800 px-5 font-semibold text-leaf-900 hover:bg-leaf-50">
          Continue shopping
        </Link>
      </div>
    </div>
  );
}

function Waiting() {
  return (
    <div className="mx-auto max-w-5xl px-4 pt-12 sm:px-6 lg:pt-16" role="status">
      <Loader2 className="size-10 animate-spin text-leaf-700" aria-hidden />
      <p className="mt-4 text-ink-soft">Loading your order…</p>
    </div>
  );
}
