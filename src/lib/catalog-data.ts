import "server-only";
import { cacheLife, cacheTag, io } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import type { Catalog, Combo, Texture } from "./catalog";
import { type ApiColors, type ApiProduct, type ProductPage, productsPath, toProduct, toProductPage } from "./catalog-api";

// Reads the catalog from catalog-service through the gateway (§15.3).
//
// The result is cached under the "catalog" tag and refreshed two ways:
// catalog-service calls /api/revalidate after every admin edit (seconds),
// and the cache expires on its own after a few hours as a safety net.
//
// Catalog reads are kept out of the build: the backend isn't reachable while
// `next build` runs (in Docker or CI), so pages render the catalog at request
// time, from this cache.

export const CATALOG_TAG = "catalog";

const GATEWAY = () => process.env.GATEWAY_URL ?? "http://localhost:4000";

interface ApiBundle {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  pricePaise: number;
  compareAtPaise: number | null;
  tint: string;
  extras: string[];
  availableUntil: string | null;
  images: { src: string; srcSet: string; alt: string }[];
  items: {
    productId: string;
    slug: string;
    name: string;
    nameTe: string;
    grams: number;
    label: string;
    texture: Texture;
    colors: ApiColors;
  }[];
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${GATEWAY()}/api/v1${path}`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`catalog ${path}: HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

const toCombo = (b: ApiBundle): Combo => ({
  id: b.id,
  slug: b.slug,
  name: b.name,
  tagline: b.tagline,
  price: b.pricePaise,
  ...(b.compareAtPaise != null && b.compareAtPaise > b.pricePaise && { compareAt: b.compareAtPaise }),
  extras: b.extras,
  tint: b.tint,
  endsAt: b.availableUntil,
  images: b.images ?? [],
  items: b.items.map((i) => ({
    productId: i.productId,
    slug: i.slug,
    name: i.name,
    telugu: i.nameTe,
    qty: i.label,
    grams: i.grams,
    fill: i.colors.fill,
    fillDeep: i.colors.fillDeep,
    tint: i.colors.tint,
    texture: i.texture,
  })),
});

// Straight from the API, uncached. Checkout uses this so it always charges
// today's prices.
export async function fetchCatalog(): Promise<Catalog> {
  const products: ApiProduct[] = [];
  let cursor: string | null = null;
  do {
    const page: { items: ApiProduct[]; nextCursor: string | null } = await get(productsPath(100, cursor));
    products.push(...page.items);
    cursor = page.nextCursor;
  } while (cursor);

  const [bundles, categories] = await Promise.all([
    get<{ items: ApiBundle[] }>("/bundles"),
    get<{ items: Catalog["categories"] }>("/categories"),
  ]);
  return {
    products: products.map(toProduct).filter((p) => p.skus.length > 0),
    combos: bundles.items.map(toCombo),
    categories: categories.items.filter((c) => c.productCount > 0),
  };
}

async function cachedCatalog(): Promise<Catalog> {
  "use cache";
  cacheTag(CATALOG_TAG);
  cacheLife("hours");
  return fetchCatalog();
}

// For pages. Throws when the catalog can't be loaded (app/error.tsx shows it).
export async function getCatalog(): Promise<Catalog> {
  await io();
  const catalog = await cachedCatalog();
  // A combo whose offer ended since the cache filled is gone right away.
  const now = Date.now();
  return { ...catalog, combos: catalog.combos.filter((c) => !c.endsAt || Date.parse(c.endsAt) > now) };
}

// The first `limit` products, for the home page (10) and /shop (20). Cached
// like the catalog; later pages are fetched by the browser ("Show more").
export async function getProductPage(limit: number): Promise<ProductPage> {
  await io();
  return cachedProductPage(limit);
}

async function cachedProductPage(limit: number): Promise<ProductPage> {
  "use cache";
  cacheTag(CATALOG_TAG);
  cacheLife("hours");
  return toProductPage(await get(productsPath(limit)));
}

// null instead of an error, for parts that should keep working when the
// catalog can't be reached (header, footer, cart). Next.js's own signals,
// such as the build-time stop at io(), are passed through, not swallowed.
export async function getCatalogOrNull(): Promise<Catalog | null> {
  try {
    return await getCatalog();
  } catch (err) {
    unstable_rethrow(err);
    console.error("catalog unavailable", err);
    return null;
  }
}
