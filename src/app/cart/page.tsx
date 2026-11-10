"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useCart } from "@/components/cart/CartProvider";
import { CartNotices, CartTotals, CouponForm, DeliveryCheck } from "@/components/cart/CartSummary";
import { CatalogUnavailable } from "@/components/cart/CatalogUnavailable";
import { LineItem } from "@/components/cart/LineItem";
import { useCatalog } from "@/components/catalog/CatalogProvider";
import { checkoutProblem } from "@/lib/cart";

const Loading = () => <div className="mt-10 h-40 animate-pulse rounded-[24px] bg-leaf-50" aria-label="Loading cart" />;

export default function CartPage() {
  const { ready } = useCart();

  return (
    <div className="mx-auto max-w-5xl px-4 pt-10 sm:px-6 lg:pt-14">
      <h1 className="font-display text-4xl font-extrabold tracking-[-0.03em] text-leaf-900 sm:text-5xl">Your cart</h1>
      {ready ? (
        <Suspense fallback={<Loading />}>
          <CartContents />
        </Suspense>
      ) : (
        <Loading />
      )}
    </div>
  );
}

function CartContents() {
  const { cart, error } = useCart();
  const catalog = useCatalog();

  if (!cart) return <CatalogUnavailable className="mt-10" />;

  if (cart.lines.length === 0) {
    return (
      <div className="mt-10 rounded-[28px] bg-leaf-50 px-6 py-16 text-center">
        <p className="font-display text-2xl font-bold text-leaf-900">Your cart is empty</p>
        <p className="mt-2 text-ink-soft">Add a jar or a combo. We only start preparing it after you order.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/shop" className="rounded-full bg-turmeric-500 px-6 py-3 font-semibold text-leaf-950 hover:bg-turmeric-600">
            Shop products
          </Link>
          <Link href="/combos" className="rounded-full border-2 border-leaf-800 px-6 py-3 font-semibold text-leaf-900 hover:bg-white">
            See combos
          </Link>
        </div>
      </div>
    );
  }

  const problem = checkoutProblem(cart);
  return (
    <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_360px]">
      <div className="space-y-4">
        {error && <CatalogUnavailable />}
        <CartNotices cart={cart} />
        <ul className="divide-y divide-line border-y border-line">
          {cart.lines.map((l) => (
            <LineItem key={l.key} catalog={catalog} line={l} />
          ))}
        </ul>
      </div>
      <aside className="h-fit space-y-5 rounded-[24px] bg-leaf-50 p-6 lg:sticky lg:top-28">
        <h2 className="font-display text-xl font-bold text-leaf-900">Order summary</h2>
        <CouponForm />
        <DeliveryCheck />
        <CartTotals cart={cart} />
        {problem && (
          <p role="alert" className="rounded-xl bg-chilli-100 px-4 py-3 text-[15px] font-medium text-chilli-700">
            {problem}
          </p>
        )}
        <div>
          <Link
            href="/checkout"
            aria-disabled={!cart.canCheckout}
            className={`flex h-14 items-center justify-center rounded-full text-[17px] font-bold ${
              cart.canCheckout ? "bg-turmeric-500 text-leaf-950 hover:bg-turmeric-600" : "pointer-events-none bg-line text-ink-mute"
            }`}
          >
            Checkout
          </Link>
          <p className="mt-3 text-center text-[13px] text-ink-mute">Secure payment by Razorpay: UPI, cards, netbanking</p>
        </div>
      </aside>
    </div>
  );
}
