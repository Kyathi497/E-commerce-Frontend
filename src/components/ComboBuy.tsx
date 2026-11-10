"use client";

import { ShoppingBag } from "lucide-react";
import { type Combo, formatINR } from "@/lib/catalog";
import { useCart } from "./cart/CartProvider";
import { useComboStock } from "./catalog/StockProvider";

export function ComboBuy({ combo }: { combo: Combo }) {
  const { add } = useCart();
  const soldOut = useComboStock(combo) === "out";
  return (
    <button
      type="button"
      onClick={() => add({ kind: "combo", slug: combo.slug, qty: 1 })}
      disabled={soldOut}
      className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-turmeric-500 text-[17px] font-bold text-leaf-950 transition-colors hover:bg-turmeric-600 disabled:cursor-not-allowed disabled:bg-leaf-100 disabled:text-ink-mute"
    >
      <ShoppingBag className="size-5" aria-hidden />
      {soldOut ? "Sold out for now" : <>Add combo · {formatINR(combo.price)}</>}
    </button>
  );
}
