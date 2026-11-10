"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { Plus } from "lucide-react";
import { formatINR, jarLevel, type Product, type Sku } from "@/lib/catalog";
import { Jar } from "./Jar";
import { useCart } from "./cart/CartProvider";
import { type StockLevel, useStock } from "./catalog/StockProvider";

export function SizePicker({
  skus,
  value,
  onChange,
  name,
  large = false,
}: {
  skus: Sku[];
  value: string;
  onChange: (code: string) => void;
  name: string;
  large?: boolean;
}) {
  return (
    <fieldset className="flex gap-2">
      <legend className="sr-only">Choose size</legend>
      {skus.map((s) => {
        const checked = value === s.code;
        return (
          <label
            key={s.code}
            className={`flex flex-1 cursor-pointer flex-col items-center rounded-xl border-2 text-center transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-leaf-700 ${
              large ? "py-3" : "py-2"
            } ${checked ? "border-leaf-800 bg-leaf-50 text-leaf-950" : "border-line bg-white text-ink-soft hover:border-leaf-200"}`}
          >
            <input
              type="radio"
              name={name}
              value={s.code}
              checked={checked}
              onChange={() => onChange(s.code)}
              className="sr-only"
            />
            <span className={`font-semibold leading-tight ${large ? "text-[17px]" : "text-[15px]"}`}>{s.label}</span>
            <span className={`tabular leading-tight ${large ? "text-[15px]" : "text-[13px]"}`}>{formatINR(s.price)}</span>
          </label>
        );
      })}
    </fieldset>
  );
}

// The product's photo when it has one, otherwise its illustrated jar.
export function ProductVisual({ product, sku, className }: { product: Product; sku: Sku; className?: string }) {
  const photo = product.images[0];
  if (photo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- already resized to 400/800 px WebP by catalog-service
      <img
        src={photo.src}
        srcSet={photo.srcSet}
        sizes="(min-width: 1024px) 33vw, 50vw"
        alt={photo.alt}
        className="absolute inset-0 size-full object-cover"
        loading="lazy"
      />
    );
  }
  return (
    <Jar
      fill={product.fill}
      fillDeep={product.fillDeep}
      texture={product.texture}
      level={jarLevel(sku.netGrams)}
      className={className}
    />
  );
}

export function StockBadge({ level, className = "" }: { level: StockLevel | undefined; className?: string }) {
  if (level === "out") {
    return <span className={`rounded-full bg-chilli-700 px-2.5 py-1 text-[12px] font-bold text-white ${className}`}>Sold out</span>;
  }
  if (level === "low") {
    return (
      <span className={`rounded-full bg-turmeric-300 px-2.5 py-1 text-[12px] font-bold text-leaf-950 ${className}`}>
        Only a little left
      </span>
    );
  }
  return null;
}

export function ProductCard({ product }: { product: Product }) {
  const [code, setCode] = useState(product.skus[0]!.code);
  const sku = product.skus.find((s) => s.code === code) ?? product.skus[0]!;
  const { add } = useCart();
  const stock = useStock(product.id);
  const soldOut = stock === "out";
  const name = useId();
  const href = `/products/${product.slug}`;

  return (
    <article className="group flex flex-col">
      <Link
        href={href}
        className="relative grid aspect-[4/5] place-items-center overflow-hidden rounded-[22px] transition-[filter] group-hover:brightness-[1.02]"
        style={{ background: product.tint }}
        tabIndex={-1}
        aria-hidden
      >
        <ProductVisual
          product={product}
          sku={sku}
          className="w-[64%] transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover:-translate-y-1.5"
        />
        <span className="absolute left-2.5 top-2.5 rounded-full bg-white/85 px-2 py-0.5 text-[11px] font-semibold text-leaf-900 sm:left-3 sm:top-3 sm:px-2.5 sm:py-1 sm:text-[12px]">
          Made after you order
        </span>
        <StockBadge level={stock} className="absolute bottom-2.5 left-2.5 sm:bottom-3 sm:left-3" />
      </Link>

      <div className="flex flex-1 flex-col pt-3 sm:pt-4">
        <h3 className="font-display text-[17px] font-bold leading-tight text-ink sm:text-[19px]">
          <Link href={href} className="hover:underline">
            {product.name}
          </Link>
        </h3>
        <p lang="te" className="mt-0.5 font-telugu text-[14px] text-ink-mute">
          {product.telugu}
        </p>
        <p className="mt-2 hidden text-[15px] leading-snug text-ink-soft sm:block">{product.short}</p>
        <div className="mt-auto pt-3 sm:pt-4">
          <SizePicker skus={product.skus} value={sku.code} onChange={setCode} name={name} />
          <button
            type="button"
            onClick={() => add({ kind: "product", sku: sku.code, qty: 1 })}
            disabled={soldOut}
            aria-label={
              soldOut ? `${product.name} is sold out` : `Add ${sku.label} ${product.name} to cart, ${formatINR(sku.price)}`
            }
            className="mt-2.5 flex h-11 w-full items-center justify-center gap-1.5 rounded-full bg-leaf-800 text-[15px] font-semibold text-white transition-colors hover:bg-leaf-900 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-leaf-100 disabled:text-ink-mute sm:h-12 sm:gap-2 sm:text-base"
          >
            {soldOut ? (
              "Sold out"
            ) : (
              <>
                <Plus className="size-[18px]" aria-hidden />
                <span className="sm:hidden">Add</span>
                <span className="hidden sm:inline">
                  Add {sku.label} · {formatINR(sku.price)}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </article>
  );
}
