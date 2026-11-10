import { Check } from "lucide-react";
import { formatINR } from "@/lib/catalog";
import {
  ENDED,
  formatDateTime,
  JOURNEY,
  type OrderDetail,
  type OrderStatus,
  statusTone,
  TONE_CLASS,
} from "@/lib/orders";

export function StatusBadge({ status, label }: { status: OrderStatus; label: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[13px] font-semibold ${TONE_CLASS[statusTone(status)]}`}>
      {label}
    </span>
  );
}

// Where the order is on its way to the customer, with the time of each step
// it has reached. Orders that left the happy path show their history instead.
export function OrderProgress({ order }: { order: Pick<OrderDetail, "status" | "statusLabel" | "timeline"> }) {
  const reachedAt = new Map((order.timeline ?? []).map((t) => [t.status, t.at]));

  if (ENDED.includes(order.status) || order.status === "PENDING_PAYMENT") {
    return (
      <ol className="space-y-3">
        {(order.timeline ?? []).map((t, i) => (
          <li key={`${t.status}-${i}`} className="flex items-baseline gap-3">
            <span className="size-2.5 shrink-0 translate-y-[-1px] rounded-full bg-leaf-700" aria-hidden />
            <span className="font-semibold text-ink">{t.label}</span>
            <span className="tabular text-sm text-ink-mute">{formatDateTime(t.at)}</span>
          </li>
        ))}
      </ol>
    );
  }

  const current = JOURNEY.findIndex((s) => s.status === order.status);
  return (
    <ol className="grid gap-0 sm:grid-cols-6" aria-label="Order progress">
      {JOURNEY.map((step, i) => {
        const done = i <= current;
        const at = reachedAt.get(step.status);
        return (
          <li key={step.status} className="relative flex gap-3 pb-5 sm:flex-col sm:gap-2 sm:pb-0 sm:pr-2">
            {/* the line to the next step */}
            {i < JOURNEY.length - 1 && (
              <span
                aria-hidden
                className={`absolute left-[13px] top-7 h-[calc(100%-28px)] w-0.5 sm:left-7 sm:top-[13px] sm:h-0.5 sm:w-[calc(100%-28px)] ${
                  i < current ? "bg-leaf-700" : "bg-line"
                }`}
              />
            )}
            <span
              className={`relative grid size-7 shrink-0 place-items-center rounded-full border-2 ${
                done ? "border-leaf-700 bg-leaf-700 text-white" : "border-line bg-white"
              }`}
              aria-hidden
            >
              {done && <Check className="size-4" strokeWidth={3} />}
            </span>
            <span>
              <span className={`block text-[15px] font-semibold ${done ? "text-ink" : "text-ink-mute"}`}>
                {step.label}
                {i === current && <span className="sr-only"> (current step)</span>}
              </span>
              {at && <span className="tabular block text-[13px] text-ink-mute">{formatDateTime(at)}</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function OrderItems({ items }: { items: OrderDetail["items"] }) {
  return (
    <ul className="divide-y divide-line">
      {items.map((i, n) => (
        <li key={`${i.ref}-${n}`} className="flex items-baseline justify-between gap-4 py-3">
          <span className="min-w-0">
            <span className="block font-semibold text-ink">{i.name}</span>
            <span className="block text-sm text-ink-mute">
              {i.detail} · {i.qty} × {formatINR(i.unitPaise)}
              {i.discountPaise > 0 && <span className="text-leaf-800"> · saved {formatINR(i.discountPaise)}</span>}
            </span>
          </span>
          <span className="tabular shrink-0 font-semibold">{formatINR(i.lineTotalPaise - i.discountPaise)}</span>
        </li>
      ))}
    </ul>
  );
}

export function OrderTotalsList({ order }: { order: Pick<OrderDetail, "totals" | "couponCode" | "paymentMethod"> }) {
  const t = order.totals;
  const shipping = t.shippingPaise - t.shippingDiscountPaise;
  const row = (label: string, value: string, strong = false) => (
    <div className={`flex justify-between gap-4 ${strong ? "border-t border-line pt-3 text-[17px] font-bold text-ink" : "text-ink-soft"}`}>
      <dt>{label}</dt>
      <dd className="tabular">{value}</dd>
    </div>
  );
  return (
    <div>
      <dl className="space-y-2 text-[15px]">
        {row("Items", formatINR(t.subtotalPaise))}
        {t.discountPaise > 0 && row(order.couponCode ? `Discount (${order.couponCode})` : "Discount", `− ${formatINR(t.discountPaise)}`)}
        {row("Delivery", shipping > 0 ? formatINR(shipping) : "Free")}
        {row(order.paymentMethod === "cod" ? "To pay on delivery" : "Total", formatINR(t.totalPaise), true)}
      </dl>
      <p className="mt-2 text-[13px] text-ink-mute">Includes {formatINR(t.taxPaise)} GST.</p>
    </div>
  );
}
