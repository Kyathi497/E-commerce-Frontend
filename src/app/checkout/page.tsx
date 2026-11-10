"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense, useRef, useState } from "react";
import { Banknote, Loader2, Lock, Smartphone } from "lucide-react";
import { formatINR } from "@/lib/catalog";
import { checkoutProblem, isOk } from "@/lib/cart";
import { COD_MAX_PAISE, matchState, STATES } from "@/lib/states";
import { useCart } from "@/components/cart/CartProvider";
import { CartNotices, CartTotals, CouponForm } from "@/components/cart/CartSummary";
import { CatalogUnavailable } from "@/components/cart/CatalogUnavailable";
import { LineVisual } from "@/components/cart/LineItem";
import { useCatalog } from "@/components/catalog/CatalogProvider";
import { type SavedAddress, useAuth } from "@/components/auth/AuthProvider";
import { api } from "@/lib/api";

type Fields = "name" | "phone" | "email" | "address" | "city" | "state" | "pincode";
type Method = "prepaid" | "cod";

// order-service POST /checkout.
interface CheckoutAnswer {
  order: { number: string; status: string; paymentMethod: Method; totals: { totalPaise: number } };
  viewToken: string;
  payment: null | {
    mode: "live" | "test";
    keyId: string | null;
    razorpayOrderId: string;
    amountPaise: number;
    currency: string;
    prefill: { name: string; email: string | null; contact: string };
  };
}

interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, cb: (r: { error?: { description?: string } }) => void) => void;
    };
  }
}

function loadRazorpay(): Promise<boolean> {
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

const FIELD_META: { id: Fields; label: string; auto: string; type?: string; inputMode?: "numeric" | "tel" | "email"; span?: boolean; optional?: boolean }[] = [
  { id: "name", label: "Full name", auto: "name", span: true },
  { id: "phone", label: "Mobile number", auto: "tel-national", type: "tel", inputMode: "tel" },
  { id: "email", label: "Email", auto: "email", type: "email", inputMode: "email" },
  { id: "address", label: "House no., street, area", auto: "street-address", span: true },
  { id: "city", label: "City / town", auto: "address-level2" },
  { id: "pincode", label: "PIN code", auto: "postal-code", inputMode: "numeric" },
  { id: "state", label: "State", auto: "address-level1", span: true },
];

// order-service names fields after its request body; the form has its own ids.
const FIELD_FROM_SERVER: Record<string, Fields> = {
  "address.name": "name",
  "address.phone": "phone",
  "address.line1": "address",
  "address.city": "city",
  "address.state": "state",
  "address.pincode": "pincode",
  email: "email",
};

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-6xl px-4 pt-10 sm:px-6 lg:pt-14">
          <div className="h-96 animate-pulse rounded-[24px] bg-leaf-50" aria-label="Loading checkout" />
        </div>
      }
    >
      <Checkout />
    </Suspense>
  );
}

function Checkout() {
  const { ready, cart, clear, refresh, setPincode } = useCart();
  const catalog = useCatalog();
  const router = useRouter();
  const [values, setValues] = useState<Record<Fields, string>>({
    name: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    state: "Andhra Pradesh",
    pincode: "",
  });
  const [method, setMethod] = useState<Method>("prepaid");
  const [errors, setErrors] = useState<Partial<Record<Fields, string>>>({});
  const [status, setStatus] = useState<"idle" | "working" | "test">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [testOrder, setTestOrder] = useState<CheckoutAnswer | null>(null);
  const { user, address: saved, ready: authReady, setAddress } = useAuth();
  const [prefilled, setPrefilled] = useState<string | null>(null);
  // One Idempotency-Key per attempt at this exact order: retrying after a
  // network error, or paying again after closing Razorpay, reuses the same
  // order. Changing anything starts a new one.
  const attempt = useRef<{ signature: string; key: string } | null>(null);

  // Fill in saved details once the session (and address book) loads, without
  // overwriting typing. Runs again if the saved address arrives later.
  const prefillKey = user ? `${user.id}:${saved?.id ?? ""}` : null;
  if (authReady && user && prefilled !== prefillKey) {
    setPrefilled(prefillKey);
    const d = saved;
    setValues((v) => ({
      name: v.name || d?.name || user.name,
      phone: v.phone || d?.phone || user.phone || "",
      email: v.email || user.email,
      address: v.address || (d ? [d.line1, d.line2, d.landmark].filter(Boolean).join(", ") : ""),
      city: v.city || d?.city || "",
      state: matchState(d?.state) || v.state,
      pincode: v.pincode || d?.pincode || "",
    }));
  }

  const total = cart?.totals.totalPaise ?? 0;
  const codBlocked =
    total > COD_MAX_PAISE
      ? `Available on orders up to ${formatINR(COD_MAX_PAISE)}.`
      : cart?.delivery && !cart.delivery.codAvailable
        ? "Not available for this PIN code."
        : null;
  const payBy: Method = codBlocked ? "prepaid" : method;

  // Logged-in customers get these details filled in next time: saved as the
  // default address unless they match the one already saved. Best effort.
  async function rememberAddress() {
    if (!user) return;
    const body = {
      name: values.name,
      phone: values.phone,
      line1: values.address,
      city: values.city,
      state: values.state,
      pincode: values.pincode,
      isDefault: true,
    };
    const same =
      saved &&
      saved.line1 === body.line1.trim() &&
      saved.pincode === body.pincode.trim() &&
      saved.name === body.name.trim() &&
      saved.city === body.city.trim() &&
      saved.state === body.state;
    if (same) return;
    const res = await api<{ address: SavedAddress }>("/me/addresses", { method: "POST", body });
    if (res.ok) setAddress(res.data.address);
  }

  // The order is placed (and paid, unless it's COD): on to its confirmation page,
  // which follows the order until the payment is confirmed.
  function done(answer: CheckoutAnswer) {
    setStatus("working");
    sessionStorage.setItem("tej-last-order", JSON.stringify({ number: answer.order.number, token: answer.viewToken }));
    attempt.current = null;
    void clear();
    router.push(`/order/confirmed?number=${encodeURIComponent(answer.order.number)}`);
  }

  // The shipping charge and delivery check follow the PIN code typed here.
  async function syncPincode() {
    const pin = values.pincode.trim();
    if (/^[1-9]\d{5}$/.test(pin) && pin !== cart?.pincode) await setPincode(pin);
  }

  function fail(text: string, fields: Partial<Record<Fields, string>> = {}) {
    setErrors(fields);
    setMessage(text);
    setStatus("idle");
    const first = Object.keys(fields)[0] as Fields | undefined;
    if (first) document.getElementById(`f-${first}`)?.focus();
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("working");
    setMessage(null);
    setErrors({});

    // Price the cart once more right before paying (this also renews the
    // session), so the amount charged is the amount on screen.
    await syncPincode();
    const fresh = await refresh();
    if (!fresh) return fail("We couldn't load your cart just now. Please try again in a minute.");
    const problem = checkoutProblem(fresh);
    if (problem) return fail(problem);

    const body = {
      address: { name: values.name, phone: values.phone, line1: values.address, city: values.city, state: values.state, pincode: values.pincode },
      ...(values.email.trim() && { email: values.email }),
      paymentMethod: payBy,
      expectedTotalPaise: fresh.totals.totalPaise,
    };
    const signature = JSON.stringify([body, fresh.lines.map((l) => [l.key, l.qty]), fresh.coupon?.code ?? null]);
    if (attempt.current?.signature !== signature) attempt.current = { signature, key: crypto.randomUUID() };

    const res = await api<CheckoutAnswer>("/checkout", {
      method: "POST",
      body,
      headers: { "Idempotency-Key": attempt.current.key, ...(user && { "x-signed-in": "1" }) },
    });
    if (!res.ok) {
      // A clear "no" ends this attempt; a network error or outage can be retried as is.
      if (res.status > 0 && res.status < 500) attempt.current = null;
      if (res.error.code === "TOTAL_CHANGED" || res.error.code === "STOCK_SHORT" || res.error.code === "COUPON_NOT_APPLICABLE") void refresh();
      const fields: Partial<Record<Fields, string>> = {};
      for (const [k, v] of Object.entries(res.error.fields ?? {})) {
        const id = FIELD_FROM_SERVER[k];
        if (id) fields[id] = v;
      }
      return fail(res.error.error, fields);
    }
    void rememberAddress();
    const answer = res.data;

    if (!answer.payment) return done(answer);
    if (answer.payment.mode === "test") {
      setTestOrder(answer);
      setStatus("test");
      return;
    }

    const loaded = await loadRazorpay();
    if (!loaded || !window.Razorpay) return fail("Razorpay didn't load. Check your connection and try again, or order on WhatsApp.");

    const pay = answer.payment;
    const rzp = new window.Razorpay({
      key: pay.keyId,
      amount: pay.amountPaise,
      currency: pay.currency,
      name: "Tej Organics",
      description: `Order ${answer.order.number}`,
      order_id: pay.razorpayOrderId,
      prefill: { name: pay.prefill.name, email: pay.prefill.email ?? undefined, contact: pay.prefill.contact },
      notes: { order_number: answer.order.number },
      theme: { color: "#1F4D2E" },
      handler: async (r: RazorpayResponse) => {
        setStatus("working");
        // Speeds up the confirmation; the order is confirmed by Razorpay's
        // own report either way, so we move on whatever this answers.
        await api("/payments/verify", { method: "POST", body: r });
        done(answer);
      },
      modal: {
        ondismiss: () => {
          setStatus("idle");
          setMessage("Payment was cancelled. Your items are held for 15 minutes, so you can try again.");
        },
      },
    });
    rzp.on("payment.failed", (r) => {
      setMessage(`Payment failed: ${r.error?.description ?? "please try another method."} You can try again.`);
    });
    rzp.open();
  }

  async function simulate(outcome: "success" | "failure") {
    if (!testOrder?.payment) return;
    setStatus("working");
    const res = await api("/payments/test/complete", {
      method: "POST",
      body: { razorpayOrderId: testOrder.payment.razorpayOrderId, outcome },
    });
    if (!res.ok) return fail(res.error.error);
    if (outcome === "success") return done(testOrder);
    setStatus("test");
    setMessage("Simulated a failed payment. You can try again.");
  }

  if (ready && !cart) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20">
        <CatalogUnavailable />
      </div>
    );
  }

  const lines = cart?.lines ?? [];
  if (ready && lines.length === 0 && status !== "working") {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <h1 className="font-display text-3xl font-bold text-leaf-900">Your cart is empty</h1>
        <p className="mt-2 text-ink-soft">Add something to your cart before checking out.</p>
        <Link href="/shop" className="mt-6 inline-flex rounded-full bg-turmeric-500 px-6 py-3 font-semibold text-leaf-950">
          Shop products
        </Link>
      </div>
    );
  }

  const input = (id: Fields) =>
    `mt-1.5 block h-12 w-full rounded-xl border bg-white px-4 text-[16px] text-ink placeholder:text-ink-mute focus:border-leaf-700 focus:outline-none focus:ring-2 focus:ring-leaf-200 ${
      errors[id] ? "border-chilli-700" : "border-line"
    }`;

  const methodCard = (m: Method, title: string, detail: string, Icon: typeof Lock, blocked: string | null) => (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-2xl border-2 p-4 transition-colors ${
        blocked ? "cursor-not-allowed border-line opacity-60" : payBy === m ? "border-leaf-700 bg-leaf-50" : "border-line hover:border-leaf-300"
      }`}
    >
      <input
        type="radio"
        name="payment-method"
        value={m}
        checked={payBy === m}
        disabled={!!blocked}
        onChange={() => setMethod(m)}
        className="mt-1 size-4 accent-leaf-800"
      />
      <Icon className="mt-0.5 size-5 shrink-0 text-leaf-800" aria-hidden />
      <span>
        <span className="block font-semibold text-ink">{title}</span>
        <span className="block text-sm text-ink-soft">{blocked ?? detail}</span>
      </span>
    </label>
  );

  return (
    <div className="mx-auto max-w-6xl px-4 pt-10 sm:px-6 lg:pt-14">
      <h1 className="font-display text-4xl font-extrabold tracking-[-0.03em] text-leaf-900 sm:text-5xl">Checkout</h1>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_400px]">
        <form onSubmit={onSubmit} noValidate aria-describedby={message ? "form-msg" : undefined}>
          <fieldset disabled={status !== "idle"} className="contents">
            <legend className="font-display text-xl font-bold text-leaf-900">Delivery details</legend>
            {authReady && (
              <p className="mt-1.5 text-[15px] text-ink-soft">
                {user ? (
                  <>
                    Logged in as <span className="font-semibold text-ink">{user.email}</span>. These details are saved for
                    your next order.
                  </>
                ) : (
                  <>
                    Have an account?{" "}
                    <Link href="/login?next=%2Fcheckout" className="font-semibold text-leaf-800 underline">
                      Log in
                    </Link>{" "}
                    to fill these in, or continue as a guest.
                  </>
                )}
              </p>
            )}
            <div className="mt-5 grid gap-x-4 gap-y-5 sm:grid-cols-2">
              {FIELD_META.map((f) => (
                <div key={f.id} className={f.span ? "sm:col-span-2" : undefined}>
                  <label htmlFor={`f-${f.id}`} className="text-[15px] font-semibold text-ink">
                    {f.label}
                    {f.id === "email" && user && <span className="font-normal text-ink-mute"> (your account email)</span>}
                  </label>
                  {f.id === "address" ? (
                    <textarea
                      id="f-address"
                      autoComplete={f.auto}
                      rows={3}
                      value={values.address}
                      onChange={(e) => setValues((v) => ({ ...v, address: e.target.value }))}
                      aria-invalid={!!errors.address}
                      aria-describedby={errors.address ? "e-address" : undefined}
                      className={`${input("address")} h-auto py-3`}
                    />
                  ) : f.id === "state" ? (
                    <select
                      id="f-state"
                      autoComplete={f.auto}
                      value={values.state}
                      onChange={(e) => setValues((v) => ({ ...v, state: e.target.value }))}
                      aria-invalid={!!errors.state}
                      aria-describedby={errors.state ? "e-state" : undefined}
                      className={input("state")}
                    >
                      {!values.state && <option value="">Choose your state</option>}
                      {STATES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      id={`f-${f.id}`}
                      type={f.type ?? "text"}
                      inputMode={f.inputMode}
                      autoComplete={f.auto}
                      value={values[f.id]}
                      readOnly={f.id === "email" && !!user}
                      onChange={(e) => setValues((v) => ({ ...v, [f.id]: e.target.value }))}
                      onBlur={f.id === "pincode" ? () => void syncPincode() : undefined}
                      aria-invalid={!!errors[f.id]}
                      aria-describedby={errors[f.id] ? `e-${f.id}` : undefined}
                      className={input(f.id)}
                    />
                  )}
                  {errors[f.id] && (
                    <p id={`e-${f.id}`} className="mt-1.5 text-sm font-medium text-chilli-700">
                      {errors[f.id]}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <h2 className="mt-10 font-display text-xl font-bold text-leaf-900">Payment</h2>
            <div className="mt-4 grid gap-3" role="radiogroup" aria-label="Payment method">
              {methodCard("prepaid", "Pay online", "UPI, cards, netbanking and wallets, via Razorpay.", Smartphone, null)}
              {methodCard("cod", "Cash on delivery", "Pay in cash when your order arrives.", Banknote, codBlocked)}
            </div>
          </fieldset>

          {message && (
            <p id="form-msg" role="alert" className="mt-6 rounded-xl bg-chilli-100 px-4 py-3 text-[15px] font-medium text-chilli-700">
              {message}
            </p>
          )}

          {status === "test" && testOrder ? (
            <div className="mt-8 rounded-[20px] border-2 border-dashed border-turmeric-600 bg-turmeric-100 p-5">
              <p className="font-display text-lg font-bold text-leaf-950">Test mode: no money will be charged</p>
              <p className="mt-1 text-[15px] text-ink-soft">
                Order {testOrder.order.number} is placed and waiting for payment. Razorpay keys aren&apos;t set on the payment
                service, so you can simulate the payment instead.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => void simulate("success")}
                  className="h-12 rounded-full bg-leaf-800 px-5 font-semibold text-white hover:bg-leaf-900"
                >
                  Simulate successful payment
                </button>
                <button
                  type="button"
                  onClick={() => void simulate("failure")}
                  className="h-12 rounded-full px-5 font-semibold text-leaf-900 hover:bg-white"
                >
                  Simulate a failed payment
                </button>
              </div>
            </div>
          ) : (
            <button
              type="submit"
              disabled={status !== "idle" || !ready}
              className="mt-8 flex h-14 w-full items-center justify-center gap-2 rounded-full bg-turmeric-500 text-[17px] font-bold text-leaf-950 transition-colors hover:bg-turmeric-600 disabled:cursor-wait disabled:opacity-70"
            >
              {status === "working" ? (
                <>
                  <Loader2 className="size-5 animate-spin" aria-hidden /> {payBy === "cod" ? "Placing your order…" : "Starting secure payment…"}
                </>
              ) : payBy === "cod" ? (
                <>Place order · pay {formatINR(total)} on delivery</>
              ) : (
                <>
                  <Lock className="size-[18px]" aria-hidden /> Pay {formatINR(total)} with Razorpay
                </>
              )}
            </button>
          )}
          <p className="mt-3 text-center text-[13px] text-ink-mute">
            {payBy === "cod"
              ? "Keep the exact amount ready if you can. Your order is prepared fresh once it's placed."
              : "Your items are held for 15 minutes while you pay. Your order is prepared after payment."}
          </p>
        </form>

        <aside className="h-fit rounded-[24px] bg-leaf-50 p-6 lg:sticky lg:top-28" aria-labelledby="sum-title">
          <h2 id="sum-title" className="font-display text-xl font-bold text-leaf-900">
            Order summary
          </h2>
          <ul className="mt-4 space-y-3">
            {lines.map((l) => (
              <li key={l.key} className="flex items-center gap-3">
                <LineVisual catalog={catalog} line={l} className="size-14 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{isOk(l) ? l.name : "No longer sold"}</p>
                  <p className={`text-sm ${isOk(l) && l.stock !== "out" ? "text-ink-mute" : "font-semibold text-chilli-700"}`}>
                    {isOk(l) ? `${l.detail} × ${l.qty}${l.stock === "out" ? " · sold out" : ""}` : "Remove it from your cart"}
                  </p>
                </div>
                {isOk(l) && <p className="tabular font-semibold">{formatINR(l.lineTotalPaise - l.discountPaise)}</p>}
              </li>
            ))}
          </ul>
          {cart && (
            <div className="mt-5 space-y-4 border-t border-leaf-200 pt-4">
              <CartNotices cart={cart} />
              <CouponForm />
              {cart.delivery && (
                <p className={`text-sm ${cart.delivery.serviceable === false ? "font-semibold text-chilli-700" : "text-ink-soft"}`}>
                  {cart.delivery.message}
                </p>
              )}
              <CartTotals cart={cart} />
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
