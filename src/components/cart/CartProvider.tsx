"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { api, type ApiResult } from "@/lib/api";
import { type CartLine, lineKey } from "@/lib/catalog";
import type { ServerCart, ServerLine } from "@/lib/cart";
import { useAuth } from "../auth/AuthProvider";

// Carts used to live only in the browser. Whatever is still saved under these
// keys is moved to the server once, then removed.
const STORAGE_KEY = "tej-cart-v2";
const LEGACY_KEY = "tej-cart-v1";

export type CartResult = { ok: true } | { ok: false; message: string; field?: string };

interface CartContextValue {
  // The live-priced cart from cart-service; null until it first loads.
  cart: ServerCart | null;
  lines: ServerLine[];
  count: number;
  ready: boolean;
  // Set when the cart couldn't be loaded or changed (e.g. prices unavailable).
  error: string | null;
  open: boolean;
  setOpen: (open: boolean) => void;
  add: (line: CartLine) => Promise<CartResult>;
  setQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
  clear: () => Promise<void>;
  applyCoupon: (code: string) => Promise<CartResult>;
  removeCoupon: () => Promise<void>;
  setPincode: (pincode: string | null) => Promise<CartResult>;
  acceptPrices: () => Promise<void>;
  // Fetches the cart again (and renews the session if it lapsed).
  refresh: () => Promise<ServerCart | null>;
  lastAdded: string | null;
}

const CartContext = createContext<CartContextValue | null>(null);

type CartResponse = ApiResult<{ cart: ServerCart }>;

// Lines saved by the old browser-only cart. v1 lines named a product and a
// size and can't be mapped without the catalog; they're dropped.
function savedLines(): CartLine[] {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as CartLine[];
    return stored.filter((l) => l && l.qty > 0 && (l.kind === "product" ? !!l.sku : l.kind === "combo" && !!l.slug));
  } catch {
    return [];
  }
}

function forgetSavedLines() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    /* storage blocked */
  }
}

const toBody = (l: CartLine) => (l.kind === "product" ? { kind: l.kind, sku: l.sku, qty: l.qty } : { kind: l.kind, slug: l.slug, qty: l.qty });

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user, ready: authReady } = useAuth();
  const [cart, setCart] = useState<ServerCart | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [lastAdded, setLastAdded] = useState<string | null>(null);
  // Requests run one at a time so answers arrive in the order they were made.
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  // Read by send(); kept in step before the load effect below runs.
  const signedIn = useRef(false);
  useEffect(() => {
    signedIn.current = !!user;
  }, [user]);

  const send = useCallback((path: string, method = "GET", body?: unknown): Promise<CartResponse> => {
    const run = async () => {
      const headers = signedIn.current ? { "x-signed-in": "1" } : undefined;
      let res = await api<{ cart: ServerCart }>(`/cart${path}`, { method, body, headers });
      // The session couldn't be renewed: carry on as a guest.
      if (!res.ok && res.status === 401 && headers) res = await api<{ cart: ServerCart }>(`/cart${path}`, { method, body });
      if (res.ok) {
        setCart(res.data.cart);
        setError(null);
      } else if (res.status === 503 || res.status === 0) {
        setError(res.error.error);
      }
      return res;
    };
    const next = queue.current.then(run, run);
    queue.current = next.catch(() => undefined);
    return next;
  }, []);

  // Load once we know who is signed in, and again whenever that changes:
  // signing in merges the guest cart into the account's cart.
  const userId = user?.id ?? null;
  useEffect(() => {
    if (!authReady) return;
    void (async () => {
      const res = await send(userId ? "/merge" : "", userId ? "POST" : "GET");
      const saved = savedLines();
      if (saved.length && res.ok) {
        const moved = await send("/import", "POST", { lines: saved.slice(0, 40).map(toBody) });
        if (moved.ok || moved.status === 422) forgetSavedLines();
      }
    })();
  }, [authReady, userId, send]);

  const add = useCallback(
    async (line: CartLine): Promise<CartResult> => {
      setLastAdded(lineKey(line));
      setOpen(true);
      const res = await send("/items", "POST", toBody(line));
      return res.ok ? { ok: true } : { ok: false, message: res.error.error };
    },
    [send],
  );

  // Quantity changes show at once; the server's answer then replaces them.
  const setQty = useCallback(
    (key: string, qty: number) => {
      if (qty <= 0) {
        setCart((c) => c && { ...c, lines: c.lines.filter((l) => l.key !== key) });
        void send(`/items/${encodeURIComponent(key)}`, "DELETE");
        return;
      }
      const capped = Math.min(20, qty);
      setCart((c) => c && { ...c, lines: c.lines.map((l) => (l.key === key ? { ...l, qty: capped } : l)) });
      void send(`/items/${encodeURIComponent(key)}`, "PATCH", { qty: capped });
    },
    [send],
  );

  const remove = useCallback((key: string) => setQty(key, 0), [setQty]);

  const clear = useCallback(async () => {
    await send("", "DELETE");
  }, [send]);

  const applyCoupon = useCallback(
    async (code: string): Promise<CartResult> => {
      const res = await send("/coupon", "POST", { code });
      return res.ok ? { ok: true } : { ok: false, message: res.error.fields?.code ?? res.error.error, field: "code" };
    },
    [send],
  );

  const removeCoupon = useCallback(async () => {
    await send("/coupon", "DELETE");
  }, [send]);

  const setPincode = useCallback(
    async (pincode: string | null): Promise<CartResult> => {
      const res = await send("/pincode", "PUT", { pincode });
      return res.ok ? { ok: true } : { ok: false, message: res.error.fields?.pincode ?? res.error.error, field: "pincode" };
    },
    [send],
  );

  const acceptPrices = useCallback(async () => {
    await send("/prices/accept", "POST");
  }, [send]);

  const refresh = useCallback(async () => {
    const res = await send("");
    return res.ok ? res.data.cart : null;
  }, [send]);

  const value = useMemo<CartContextValue>(() => {
    const lines = cart?.lines ?? [];
    return {
      cart,
      lines,
      count: lines.reduce((n, l) => n + l.qty, 0),
      // Loaded, or known to be unavailable (pages then show `error`).
      ready: cart !== null || error !== null,
      error,
      open,
      setOpen,
      add,
      setQty,
      remove,
      clear,
      applyCoupon,
      removeCoupon,
      setPincode,
      acceptPrices,
      refresh,
      lastAdded,
    };
  }, [cart, error, open, add, setQty, remove, clear, applyCoupon, removeCoupon, setPincode, acceptPrices, refresh, lastAdded]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
