"use client";

import { useState } from "react";
import { Loader2, MapPin, Tag, X } from "lucide-react";
import { formatINR } from "@/lib/catalog";
import type { ServerCart } from "@/lib/cart";
import { useCart } from "./CartProvider";

// Subtotal, each saving, shipping and total, exactly as cart-service worked
// them out.
export function CartTotals({ cart, className = "" }: { cart: ServerCart; className?: string }) {
  const { totals, offers, coupon } = cart;
  const itemOffers = offers.filter((o) => !o.freeShipping && o.discountPaise > 0);
  const freeShippingBy = coupon?.applied && coupon.freeShipping ? coupon.code : offers.find((o) => o.freeShipping)?.name;
  const saved = totals.discountPaise + totals.shippingDiscountPaise;

  return (
    <dl className={`tabular space-y-1.5 text-[15px] ${className}`}>
      <div className="flex justify-between">
        <dt className="text-ink-soft">Subtotal</dt>
        <dd>{formatINR(totals.subtotalPaise)}</dd>
      </div>
      {itemOffers.map((o) => (
        <div key={o.name} className="flex justify-between text-leaf-700">
          <dt>{o.name}</dt>
          <dd>−{formatINR(o.discountPaise)}</dd>
        </div>
      ))}
      {coupon?.applied && !coupon.freeShipping && (
        <div className="flex justify-between text-leaf-700">
          <dt>Coupon {coupon.code}</dt>
          <dd>−{formatINR(coupon.discountPaise)}</dd>
        </div>
      )}
      <div className="flex justify-between">
        <dt className="text-ink-soft">Shipping</dt>
        <dd>
          {totals.shippingDiscountPaise > 0 && (
            <span className="mr-1.5 text-ink-mute line-through">{formatINR(totals.shippingPaise + totals.shippingDiscountPaise)}</span>
          )}
          {totals.shippingPaise === 0 && totals.itemCount > 0 ? "Free" : formatINR(totals.shippingPaise)}
        </dd>
      </div>
      {totals.shippingDiscountPaise > 0 && freeShippingBy && <p className="text-right text-[13px] text-leaf-700">Free shipping: {freeShippingBy}</p>}
      <div className="flex justify-between border-t border-leaf-200 pt-2.5 text-lg font-bold text-leaf-950">
        <dt>Total</dt>
        <dd>{formatINR(totals.totalPaise)}</dd>
      </div>
      {saved > 0 && <p className="text-right text-sm font-semibold text-leaf-700">You save {formatINR(saved)}</p>}
    </dl>
  );
}

export function CouponForm() {
  const { cart, applyCoupon, removeCoupon } = useCart();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const coupon = cart?.coupon;

  if (coupon) {
    return (
      <div className={`rounded-xl px-4 py-3 ${coupon.applied ? "bg-leaf-100" : "bg-turmeric-100"}`}>
        <div className="flex items-center justify-between gap-3">
          <p className="flex items-center gap-2 font-semibold text-leaf-900">
            <Tag className="size-4" aria-hidden />
            {coupon.code}
            {coupon.applied && coupon.description && <span className="font-normal text-ink-soft">· {coupon.description}</span>}
          </p>
          <button
            type="button"
            onClick={() => void removeCoupon()}
            className="grid size-8 place-items-center rounded-full text-ink-mute hover:bg-white"
            aria-label={`Remove coupon ${coupon.code}`}
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
        {!coupon.applied && <p className="mt-1 text-sm text-ink-soft">{coupon.message}</p>}
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setBusy(true);
    setError(null);
    const res = await applyCoupon(code.trim());
    setBusy(false);
    if (res.ok) setCode("");
    else setError(res.message);
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <label htmlFor="coupon" className="text-[15px] font-semibold text-ink">
        Coupon code
      </label>
      <div className="mt-1.5 flex gap-2">
        <input
          id="coupon"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={40}
          aria-invalid={!!error}
          aria-describedby={error ? "coupon-error" : undefined}
          className={`h-11 min-w-0 flex-1 rounded-xl border bg-white px-3.5 text-[16px] uppercase tracking-wide placeholder:normal-case placeholder:tracking-normal focus:border-leaf-700 focus:outline-none focus:ring-2 focus:ring-leaf-200 ${
            error ? "border-chilli-700" : "border-line"
          }`}
          placeholder="Enter code"
        />
        <button
          type="submit"
          disabled={busy || !code.trim()}
          className="h-11 rounded-xl bg-leaf-800 px-4 font-semibold text-white hover:bg-leaf-900 disabled:opacity-50"
        >
          {busy ? <Loader2 className="size-4 animate-spin" aria-label="Checking" /> : "Apply"}
        </button>
      </div>
      {error && (
        <p id="coupon-error" role="alert" className="mt-1.5 text-sm font-medium text-chilli-700">
          {error}
        </p>
      )}
    </form>
  );
}

// "Delivers to 520003 in 2–3 days" under a PIN code box.
export function DeliveryCheck() {
  const { cart, setPincode } = useCart();
  const [pin, setPin] = useState(cart?.pincode ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const delivery = cart?.delivery;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^[1-9]\d{5}$/.test(pin)) {
      setError("Enter a 6-digit PIN code.");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await setPincode(pin);
    setBusy(false);
    if (!res.ok) setError(res.message);
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <label htmlFor="delivery-pin" className="text-[15px] font-semibold text-ink">
        Check delivery
      </label>
      <div className="mt-1.5 flex gap-2">
        <input
          id="delivery-pin"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
          inputMode="numeric"
          autoComplete="postal-code"
          placeholder="PIN code"
          aria-invalid={!!error}
          aria-describedby="delivery-msg"
          className={`h-11 min-w-0 flex-1 rounded-xl border bg-white px-3.5 text-[16px] focus:border-leaf-700 focus:outline-none focus:ring-2 focus:ring-leaf-200 ${
            error ? "border-chilli-700" : "border-line"
          }`}
        />
        <button
          type="submit"
          disabled={busy}
          className="h-11 rounded-xl border-2 border-leaf-800 px-4 font-semibold text-leaf-900 hover:bg-white disabled:opacity-50"
        >
          {busy ? <Loader2 className="size-4 animate-spin" aria-label="Checking" /> : "Check"}
        </button>
      </div>
      <p id="delivery-msg" aria-live="polite" className="mt-1.5 text-sm">
        {error ? (
          <span className="font-medium text-chilli-700">{error}</span>
        ) : delivery ? (
          <span className={`flex items-start gap-1.5 ${delivery.serviceable === false ? "font-medium text-chilli-700" : "text-ink-soft"}`}>
            <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
            {delivery.message}
          </span>
        ) : null}
      </p>
    </form>
  );
}

// Things the shopper should know about this cart, from cart-service.
export function CartNotices({ cart }: { cart: ServerCart }) {
  const { acceptPrices } = useCart();
  // Delivery problems show under the PIN code box.
  const notices = cart.notices.filter((n) => n.code !== "NOT_DELIVERABLE");
  if (!notices.length) return null;
  return (
    <ul className="space-y-2">
      {notices.map((n) => (
        <li key={n.code} className="flex items-start justify-between gap-3 rounded-xl bg-turmeric-100 px-4 py-3 text-[15px] text-leaf-950">
          <span>{n.message}</span>
          {n.code === "PRICE_CHANGED" && (
            <button type="button" onClick={() => void acceptPrices()} className="shrink-0 font-semibold text-leaf-800 underline">
              OK
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
