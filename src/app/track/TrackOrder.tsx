"use client";

import Link from "next/link";
import { useState } from "react";
import { Loader2, Search } from "lucide-react";
import { api } from "@/lib/api";
import { formatDateTime, type OrderDetail } from "@/lib/orders";
import { useAuth } from "@/components/auth/AuthProvider";
import { FieldError, inputClass, Notice, primaryButton } from "@/components/account/AccountShell";
import { OrderItems, OrderProgress, OrderTotalsList, StatusBadge } from "@/components/orders/OrderParts";

export function TrackOrder() {
  const { user } = useAuth();
  const [number, setNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [order, setOrder] = useState<OrderDetail | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setMessage(null);
    const res = await api<{ order: OrderDetail }>("/orders/track", { method: "POST", body: { orderNumber: number, phone } });
    setBusy(false);
    if (!res.ok) {
      setOrder(null);
      setErrors(res.error.fields ?? {});
      setMessage(res.error.error);
      return;
    }
    setOrder(res.data.order);
  }

  return (
    <>
      {user && (
        <p className="mt-4 text-[15px] text-ink-soft">
          Logged in? Your orders are all in{" "}
          <Link href="/account/orders" className="font-semibold text-leaf-800 underline">
            your account
          </Link>
          .
        </p>
      )}
      <form onSubmit={onSubmit} noValidate className="mt-8 grid gap-x-4 gap-y-5 sm:grid-cols-[1fr_1fr_auto] sm:items-start">
        <div>
          <label htmlFor="t-number" className="text-[15px] font-semibold text-ink">
            Order number
          </label>
          <input
            id="t-number"
            placeholder="TEJ-26-000123"
            autoCapitalize="characters"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            aria-invalid={!!errors.orderNumber}
            aria-describedby={errors.orderNumber ? "t-number-e" : undefined}
            className={`${inputClass(!!errors.orderNumber)} tabular uppercase`}
          />
          <FieldError id="t-number-e" message={errors.orderNumber} />
        </div>
        <div>
          <label htmlFor="t-phone" className="text-[15px] font-semibold text-ink">
            Mobile number
          </label>
          <input
            id="t-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            aria-invalid={!!errors.phone}
            aria-describedby={errors.phone ? "t-phone-e" : undefined}
            className={inputClass(!!errors.phone)}
          />
          <FieldError id="t-phone-e" message={errors.phone} />
        </div>
        <button type="submit" disabled={busy} className={`${primaryButton} sm:mt-[30px]`}>
          {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Search className="size-4" aria-hidden />} Track
        </button>
      </form>

      {message && !Object.keys(errors).length && (
        <div className="mt-6">
          <Notice kind="error">{message}</Notice>
        </div>
      )}

      {order && (
        <section aria-labelledby="t-result" className="mt-10" aria-live="polite">
          <div className="flex flex-wrap items-center gap-3">
            <h2 id="t-result" className="tabular font-display text-2xl font-bold text-leaf-900">
              {order.number}
            </h2>
            <StatusBadge status={order.status} label={order.statusLabel} />
          </div>
          <p className="mt-1 text-[15px] text-ink-mute">Placed {formatDateTime(order.placedAt)}</p>
          <div className="mt-6 rounded-[24px] border border-line p-5 sm:p-6">
            <OrderProgress order={order} />
          </div>
          <div className="mt-8 grid gap-8 sm:grid-cols-[1fr_280px]">
            <OrderItems items={order.items} />
            <div className="h-fit rounded-[20px] bg-leaf-50 p-5">
              <OrderTotalsList order={order} />
            </div>
          </div>
        </section>
      )}
    </>
  );
}
