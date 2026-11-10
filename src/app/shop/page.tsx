import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { type Catalog, comboPriceLabel, formatINR, sharedSizes, STORE } from "@/lib/catalog";
import type { ProductPage } from "@/lib/catalog-api";
import { getCatalog, getProductPage } from "@/lib/catalog-data";
import { ProductCard } from "@/components/ProductCard";
import { PagedProductGrid } from "@/components/catalog/PagedProductGrid";

// "All" starts with the home page's 10 plus the next 10; "Show more" adds 10 at a time.
const FIRST_PAGE = 20;

export const metadata: Metadata = {
  title: "Shop all products",
  description: "Turmeric, spice powders, ginger-garlic paste, honey, ghee, moringa and ragi, freshly prepared after every order.",
};

export default function ShopPage(props: PageProps<"/shop">) {
  return (
    <Suspense fallback={<ShopSkeleton />}>
      <FilteredShop searchParams={props.searchParams} />
    </Suspense>
  );
}

async function FilteredShop({ searchParams }: { searchParams: PageProps<"/shop">["searchParams"] }) {
  const [{ category }, catalog] = await Promise.all([searchParams, getCatalog()]);
  const active = catalog.categories.find((c) => c.slug === category) ?? null;
  const firstPage = active ? null : await getProductPage(FIRST_PAGE);
  return <ShopView catalog={catalog} active={active?.slug ?? null} firstPage={firstPage} />;
}

function ShopSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:pt-14" aria-label="Loading products">
      <h1 className="font-display text-4xl font-extrabold tracking-[-0.03em] text-leaf-900 sm:text-5xl">Shop all products</h1>
      <div className="mt-10 grid grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-6 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="aspect-[4/5] animate-pulse rounded-[22px] bg-leaf-50" />
        ))}
      </div>
    </div>
  );
}

function ShopView({
  catalog,
  active,
  firstPage,
}: {
  catalog: Catalog;
  active: string | null;
  firstPage: ProductPage | null;
}) {
  const { products, categories, combos } = catalog;
  const sizes = sharedSizes(products);
  const comboPrice = comboPriceLabel(combos);

  const chip = (selected: boolean) =>
    `rounded-full px-4 py-2 text-[15px] font-medium transition-colors ${
      selected ? "bg-leaf-800 text-white" : "border border-line text-ink-soft hover:border-leaf-700 hover:text-leaf-900"
    }`;

  return (
    <div className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:pt-14">
      <h1 className="font-display text-4xl font-extrabold tracking-[-0.03em] text-leaf-900 sm:text-5xl">
        {categories.find((c) => c.slug === active)?.name ?? "Shop all products"}
      </h1>
      <p className="mt-3 max-w-[60ch] text-[17px] text-ink-soft">
        {sizes
          ? `Every product is ${sizes.map((s) => `${formatINR(s.price)} for ${s.label}`).join(" or ")}, prepared after you order.`
          : "Every product is prepared after you order."}{" "}
        Flat {formatINR(STORE.shippingFlat)} shipping per order.
      </p>

      <nav aria-label="Filter by category" className="mt-8 flex flex-wrap gap-2">
        <Link href="/shop" className={chip(!active)} aria-current={!active ? "page" : undefined}>
          All ({products.length})
        </Link>
        {categories.map((c) => (
          <Link
            key={c.slug}
            href={`/shop?category=${c.slug}`}
            className={chip(active === c.slug)}
            aria-current={active === c.slug ? "page" : undefined}
          >
            {c.name} ({products.filter((p) => p.category === c.slug).length})
          </Link>
        ))}
        {comboPrice && (
          <Link href="/combos" className={chip(false)}>
            {comboPrice} combos
          </Link>
        )}
      </nav>

      {firstPage ? (
        <PagedProductGrid initial={firstPage} />
      ) : (
        <div className="mt-10 grid grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-6 sm:gap-y-12 lg:grid-cols-3">
          {products
            .filter((p) => p.category === active)
            .map((p) => (
              <ProductCard key={p.slug} product={p} />
            ))}
        </div>
      )}
    </div>
  );
}
