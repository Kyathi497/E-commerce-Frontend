"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { type Combo, formatINR, formatOfferDate } from "@/lib/catalog";
import { ComboArt } from "./ComboArt";
import { useCart } from "./cart/CartProvider";
import { useComboStock } from "./catalog/StockProvider";
import { StockBadge } from "./ProductCard";

export function ComboCard({ combo }: { combo: Combo }) {
  const { add } = useCart();
  const stock = useComboStock(combo);
  const href = `/combos/${combo.slug}`;
  return (
    <article className="flex flex-col rounded-[26px] bg-white p-3 text-ink shadow-[0_10px_30px_rgba(10,35,20,0.18)]">
      <Link
        href={href}
        tabIndex={-1}
        aria-hidden
        className="relative block aspect-[5/4] overflow-hidden rounded-[18px] px-[8%] pt-[8%]"
        style={{ background: combo.tint }}
      >
        <ComboArt combo={combo} className="size-full" />
        {combo.compareAt && (
          <span className="tabular absolute right-3 top-3 rounded-full bg-chilli-700 px-2.5 py-1 text-[12px] font-bold text-white">
            Save {formatINR(combo.compareAt - combo.price)}
          </span>
        )}
        <StockBadge level={stock} className="absolute left-3 top-3" />
      </Link>
      <div className="flex flex-1 flex-col px-2 pb-2 pt-4">
        <h3 className="font-display text-[21px] font-bold leading-tight">
          <Link href={href} className="hover:underline">
            {combo.name}
          </Link>
        </h3>
        <p className="mt-1 text-[15px] text-ink-soft">{combo.tagline}</p>
        <ul className="mt-3 space-y-1 text-[14px] text-ink-soft">
          {combo.items.map((i) => (
            <li key={i.slug} className="flex justify-between gap-3 border-b border-dashed border-line pb-1">
              <span>{i.name}</span>
              <span className="tabular shrink-0 text-ink-mute">{i.qty}</span>
            </li>
          ))}
          <li className="pt-0.5 font-medium text-leaf-700">+ {combo.extras.join(", ")}</li>
        </ul>
        <div className="mt-auto flex items-end justify-between gap-3 pt-5">
          <div>
            <p className="tabular font-display text-[28px] font-bold leading-none text-leaf-900">
              {formatINR(combo.price)}
              {combo.compareAt && (
                <s className="ml-2 align-middle font-sans text-base font-medium text-ink-mute">
                  {formatINR(combo.compareAt)}
                </s>
              )}
            </p>
            {combo.endsAt && (
              <p className="mt-1.5 text-[13px] text-ink-mute">Offer ends {formatOfferDate(combo.endsAt)}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => add({ kind: "combo", slug: combo.slug, qty: 1 })}
            disabled={stock === "out"}
            className="flex h-12 items-center gap-1.5 rounded-full bg-turmeric-500 px-5 font-bold text-leaf-950 transition-colors hover:bg-turmeric-600 disabled:cursor-not-allowed disabled:bg-leaf-100 disabled:text-ink-mute"
          >
            {stock === "out" ? (
              "Sold out"
            ) : (
              <>
                <Plus className="size-[18px]" aria-hidden />
                Add combo
              </>
            )}
          </button>
        </div>
      </div>
    </article>
  );
}
