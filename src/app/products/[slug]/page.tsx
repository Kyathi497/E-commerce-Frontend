import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { comboPriceLabel, getProduct } from "@/lib/catalog";
import { getCatalog } from "@/lib/catalog-data";
import { ProductBuy } from "@/components/ProductBuy";
import { ProductCard } from "@/components/ProductCard";
import { ComboCard } from "@/components/ComboCard";

// Product and combo pages come from the catalog API, which isn't reachable at
// build time, so there are no prebuilt pages to start from: each page renders
// on request (from the cached catalog), and may block while it does.
export const instant = false;

export async function generateMetadata(props: PageProps<"/products/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const p = getProduct(await getCatalog(), slug);
  if (!p) return {};
  return { title: p.name, description: p.short };
}

export default async function ProductPage(props: PageProps<"/products/[slug]">) {
  const { slug } = await props.params;
  const catalog = await getCatalog();
  const product = getProduct(catalog, slug);
  if (!product) notFound();

  const { products, combos } = catalog;
  const inCombos = combos.filter((c) => c.items.some((i) => i.slug === product.slug));
  const related = products
    .filter((p) => p.slug !== product.slug && p.category === product.category)
    .concat(products.filter((p) => p.slug !== product.slug && p.category !== product.category))
    .slice(0, 3);

  return (
    <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:pt-10">
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-ink-mute">
        <ol className="flex flex-wrap items-center gap-1">
          <li>
            <Link href="/shop" className="hover:text-leaf-900 hover:underline">
              Shop
            </Link>
          </li>
          <li aria-hidden>
            <ChevronRight className="size-3.5" />
          </li>
          <li>
            <Link href={`/shop?category=${product.category}`} className="hover:text-leaf-900 hover:underline">
              {product.categoryName}
            </Link>
          </li>
          <li aria-hidden>
            <ChevronRight className="size-3.5" />
          </li>
          <li aria-current="page" className="text-ink">
            {product.name}
          </li>
        </ol>
      </nav>

      <ProductBuy product={product} />

      {inCombos.length > 0 && (
        <section aria-labelledby="combo-title" className="mt-24 rounded-[32px] bg-leaf-800 p-6 text-white sm:p-10">
          <h2 id="combo-title" className="font-display text-2xl font-bold sm:text-3xl">
            Also in our {comboPriceLabel(inCombos)} combos
          </h2>
          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {inCombos.map((c) => (
              <ComboCard key={c.slug} combo={c} />
            ))}
          </div>
        </section>
      )}

      <section aria-labelledby="related-title" className="mt-24">
        <h2 id="related-title" className="font-display text-2xl font-bold text-leaf-900 sm:text-3xl">
          Goes well with
        </h2>
        <div className="mt-8 grid grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-6 sm:gap-y-12 lg:grid-cols-3">
          {related.map((p) => (
            <ProductCard key={p.slug} product={p} />
          ))}
        </div>
      </section>
    </div>
  );
}
