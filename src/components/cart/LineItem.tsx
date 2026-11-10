"use client";

import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";
import { type Catalog, type CartLine, findSku, formatINR, getCombo, jarLevel } from "@/lib/catalog";
import { isOk, type ServerLine } from "@/lib/cart";
import { Jar } from "../Jar";
import { ComboArt } from "../ComboArt";
import { useCart } from "./CartProvider";

type LineRef = Pick<CartLine, "kind"> & ({ kind: "product"; sku: string } | { kind: "combo"; slug: string });

// The jar or combo artwork. Nothing when the catalog doesn't know the item.
export function LineVisual({ catalog, line, className }: { catalog: Catalog | null; line: LineRef; className?: string }) {
  if (catalog && line.kind === "product") {
    const found = findSku(catalog, line.sku);
    if (found) {
      const { product: p, sku } = found;
      return (
        <div className={`grid place-items-center rounded-xl ${className}`} style={{ background: p.tint }}>
          <Jar fill={p.fill} fillDeep={p.fillDeep} texture={p.texture} level={jarLevel(sku.netGrams)} label={false} className="h-[86%]" />
        </div>
      );
    }
  }
  const c = catalog && line.kind === "combo" ? getCombo(catalog, line.slug) : undefined;
  if (c) {
    return (
      <div className={`overflow-hidden rounded-xl p-1.5 ${className}`} style={{ background: c.tint }}>
        <ComboArt combo={c} className="size-full" />
      </div>
    );
  }
  return <div className={`rounded-xl bg-leaf-50 ${className}`} aria-hidden />;
}

function lineHref(catalog: Catalog | null, line: LineRef) {
  if (line.kind === "combo") return `/combos/${line.slug}`;
  const found = catalog ? findSku(catalog, line.sku) : undefined;
  return found ? `/products/${found.product.slug}` : "/shop";
}

export function LineItem({ catalog, line, compact = false }: { catalog: Catalog | null; line: ServerLine; compact?: boolean }) {
  const { setQty, remove } = useCart();
  const visual = compact ? "size-20 shrink-0" : "size-24 shrink-0";

  if (!isOk(line)) {
    return (
      <li className="flex gap-4 py-4">
        <LineVisual catalog={catalog} line={line} className={`${visual} opacity-50`} />
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="font-semibold leading-snug text-ink">{line.kind === "product" ? line.sku : line.slug}</p>
          <p className="mt-1 text-sm font-semibold text-chilli-700">No longer sold. Remove it to check out.</p>
          <button
            type="button"
            onClick={() => remove(line.key)}
            className="mt-auto flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm text-ink-mute hover:bg-chilli-100 hover:text-chilli-700"
          >
            <Trash2 className="size-4" aria-hidden />
            Remove
          </button>
        </div>
      </li>
    );
  }

  const soldOut = line.stock === "out";
  return (
    <li className="flex gap-4 py-4">
      <LineVisual catalog={catalog} line={line} className={visual} />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link href={lineHref(catalog, line)} className="font-semibold leading-snug text-ink hover:underline">
              {line.name}
            </Link>
            <p className="text-sm text-ink-mute">
              {line.detail} · {formatINR(line.unitPaise)} each
            </p>
            {line.priceChange && (
              <p className="mt-1 text-sm font-medium text-leaf-700">
                Price {line.priceChange.toPaise < line.priceChange.fromPaise ? "dropped" : "changed"} from{" "}
                <span className="tabular line-through">{formatINR(line.priceChange.fromPaise)}</span>
              </p>
            )}
            {soldOut && <p className="mt-1 text-sm font-semibold text-chilli-700">Just sold out. Remove it to check out.</p>}
            {line.stock === "low" && <p className="mt-1 text-sm font-medium text-leaf-700">Only a little left</p>}
          </div>
          <div className="shrink-0 text-right">
            <p className="tabular font-semibold">{formatINR(line.lineTotalPaise - line.discountPaise)}</p>
            {line.discountPaise > 0 && (
              <p className="tabular text-sm text-ink-mute line-through">{formatINR(line.lineTotalPaise)}</p>
            )}
          </div>
        </div>
        <div className="mt-auto flex items-center justify-between pt-2">
          <div className="flex items-center rounded-full border border-line">
            <button
              type="button"
              onClick={() => setQty(line.key, line.qty - 1)}
              className="grid size-9 place-items-center rounded-full text-leaf-900 hover:bg-leaf-50"
              aria-label={`Decrease quantity of ${line.name}`}
            >
              <Minus className="size-4" aria-hidden />
            </button>
            <span className="tabular w-7 text-center text-[15px] font-semibold" aria-live="polite">
              {line.qty}
            </span>
            <button
              type="button"
              onClick={() => setQty(line.key, line.qty + 1)}
              disabled={line.qty >= 20 || soldOut}
              className="grid size-9 place-items-center rounded-full text-leaf-900 hover:bg-leaf-50 disabled:opacity-40"
              aria-label={`Increase quantity of ${line.name}`}
            >
              <Plus className="size-4" aria-hidden />
            </button>
          </div>
          <button
            type="button"
            onClick={() => remove(line.key)}
            className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm text-ink-mute hover:bg-chilli-100 hover:text-chilli-700"
          >
            <Trash2 className="size-4" aria-hidden />
            Remove
          </button>
        </div>
      </div>
    </li>
  );
}
