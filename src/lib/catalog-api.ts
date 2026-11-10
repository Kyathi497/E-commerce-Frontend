import type { Product, Texture } from "./catalog";

// catalog-service's product shape, and how it maps to ours. Shared by the
// server (catalog-data.ts) and the browser ("Show more" on /shop).

export interface ApiColors {
  fill: string;
  fillDeep: string;
  tint: string;
}

export interface ApiProduct {
  id: string;
  slug: string;
  name: string;
  nameTe: string;
  category: { slug: string; name: string };
  short: string;
  description: string;
  uses: string[];
  texture: Texture;
  colors: ApiColors;
  skus: { code: string; label: string; netGrams: number; mrpPaise: number; pricePaise: number }[];
  images: { src: string; srcSet: string; alt: string }[];
}

export interface ProductPage {
  products: Product[];
  nextCursor: string | null;
}

export const toProduct = (p: ApiProduct): Product => ({
  id: p.id,
  slug: p.slug,
  name: p.name,
  telugu: p.nameTe,
  category: p.category.slug,
  categoryName: p.category.name,
  short: p.short,
  description: p.description,
  uses: p.uses,
  fill: p.colors.fill,
  fillDeep: p.colors.fillDeep,
  tint: p.colors.tint,
  texture: p.texture,
  skus: p.skus.map((s) => ({ code: s.code, label: s.label, netGrams: s.netGrams, price: s.pricePaise, mrp: s.mrpPaise })),
  images: p.images,
});

export const productsPath = (limit: number, cursor?: string | null) =>
  `/products?limit=${limit}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`;

export const toProductPage = (page: { items: ApiProduct[]; nextCursor: string | null }): ProductPage => ({
  products: page.items.map(toProduct).filter((p) => p.skus.length > 0),
  nextCursor: page.nextCursor,
});
