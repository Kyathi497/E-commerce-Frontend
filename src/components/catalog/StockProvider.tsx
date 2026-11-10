"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Combo } from "@/lib/catalog";

export type StockLevel = "in_stock" | "low" | "out";

// Live stock levels from inventory-service, per product id. Never cached by
// the server: fetched in the browser, only for the products that are on screen
// (each card registers its own id), and again whenever the tab comes back into
// view. Unknown (not loaded, or inventory unreachable) means "don't say
// anything", never "out of stock".
type Register = (ids: string[]) => () => void;
const StockContext = createContext<{ levels: Record<string, StockLevel>; register: Register }>({
  levels: {},
  register: () => () => {},
});

// inventory-service answers for at most 100 ids per call.
const BATCH = 100;
// Cards mount together; wait a beat so they go out as one request.
const DEBOUNCE_MS = 50;

async function fetchLevels(ids: string[]) {
  const batches: string[][] = [];
  for (let i = 0; i < ids.length; i += BATCH) batches.push(ids.slice(i, i + BATCH));
  const out: Record<string, StockLevel> = {};
  await Promise.all(
    batches.map(async (batch) => {
      try {
        const res = await fetch("/api/v1/availability", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ products: batch }),
          cache: "no-store",
        });
        if (res.ok) Object.assign(out, ((await res.json()) as { items: Record<string, StockLevel> }).items);
      } catch {
        // Keep what we had; checkout checks stock again on the server.
      }
    }),
  );
  return out;
}

export function StockProvider({ children }: { children: React.ReactNode }) {
  const [levels, setLevels] = useState<Record<string, StockLevel>>({});
  const wanted = useRef(new Map<string, number>()); // product id -> number of mounted users
  const loaded = useRef(new Set<string>());
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const load = useCallback((ids: string[]) => {
    if (!ids.length) return;
    void fetchLevels(ids).then((next) => {
      for (const id of Object.keys(next)) loaded.current.add(id);
      if (Object.keys(next).length) setLevels((prev) => ({ ...prev, ...next }));
    });
  }, []);

  const register = useCallback<Register>(
    (ids) => {
      for (const id of ids) wanted.current.set(id, (wanted.current.get(id) ?? 0) + 1);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => load([...wanted.current.keys()].filter((id) => !loaded.current.has(id))), DEBOUNCE_MS);
      return () => {
        for (const id of ids) {
          const n = (wanted.current.get(id) ?? 1) - 1;
          if (n <= 0) wanted.current.delete(id);
          else wanted.current.set(id, n);
        }
      };
    },
    [load],
  );

  useEffect(() => {
    const onVisible = () => document.visibilityState === "visible" && load([...wanted.current.keys()]);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      clearTimeout(timer.current);
    };
  }, [load]);

  const value = useMemo(() => ({ levels, register }), [levels, register]);
  return <StockContext value={value}>{children}</StockContext>;
}

export function useStock(productId: string): StockLevel | undefined {
  const { levels, register } = useContext(StockContext);
  useEffect(() => register([productId]), [register, productId]);
  return levels[productId];
}

// A combo is out when any jar in it is out, low when any is low.
export function useComboStock(combo: Combo): StockLevel | undefined {
  const { levels, register } = useContext(StockContext);
  const ids = useMemo(() => combo.items.map((i) => i.productId), [combo]);
  useEffect(() => register(ids), [register, ids]);
  return useMemo(() => {
    const own = ids.map((id) => levels[id]);
    if (own.includes("out")) return "out";
    if (own.includes("low")) return "low";
    return own.every((l) => l === "in_stock") ? "in_stock" : undefined;
  }, [ids, levels]);
}

export function useStockLevels() {
  return useContext(StockContext).levels;
}
