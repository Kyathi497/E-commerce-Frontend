// Store settings, catalog types and the helpers shared by server and browser.
// Products, sizes, prices and combos come from catalog-service (see
// catalog-data.ts) and are edited through the admin API, not here.
// Money is integer paise everywhere (₹299 = 29900).

export const STORE = {
  name: "Tej Organics",
  phone: "9603559603",
  whatsapp: "919603559603",
  city: "Vijayawada",
  address:
    "Flat No 4F1, Ravella Towers, Gosala Street, Ayodhya Nagar, Vijayawada, NTR District, Andhra Pradesh 520003",
  // The "flat ₹70 shipping" in marketing copy. Carts and checkout charge
  // what shipping-service's rules say; change this too if the rules change.
  shippingFlat: 7000,
  registrations: [
    { name: "FSSAI Registered", detail: "Reg. No. 20126132002134" },
    { name: "Certified Organic", detail: "Certificate No. EU/ORG/01333, EU Certification Ltd." },
    { name: "GST Registered", detail: "GSTIN 37BJEPK2125A1ZU" },
    { name: "Udyam (MSME) Registered", detail: "UDYAM-AP-20-0111503" },
  ],
} as const;

export type Texture = "powder" | "paste" | "honey" | "ghee";

export interface Sku {
  code: string; // e.g. TURM-1KG
  label: string; // "1 kg"
  netGrams: number;
  price: number; // paise
  mrp: number; // paise
}

export interface ProductImage {
  src: string;
  srcSet: string;
  alt: string;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  telugu: string;
  category: string; // category slug
  categoryName: string;
  short: string;
  description: string;
  uses: string[];
  fill: string; // jar contents colour
  fillDeep: string; // shading
  tint: string; // tile background
  texture: Texture;
  skus: Sku[];
  images: ProductImage[];
}

export interface ComboItem {
  productId: string;
  slug: string; // product slug
  name: string;
  telugu: string;
  qty: string; // e.g. "500 g"
  grams: number;
  fill: string;
  fillDeep: string;
  tint: string;
  texture: Texture;
}

export interface Combo {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  price: number; // paise
  compareAt?: number; // paise
  items: ComboItem[];
  extras: string[];
  tint: string;
  endsAt: string | null; // ISO; the "Limited offer" end
  images: { src: string; srcSet: string; alt: string }[];
}

export interface Category {
  slug: string;
  name: string;
  productCount: number;
}

export interface Catalog {
  products: Product[];
  combos: Combo[];
  categories: Category[];
}

export const getProduct = (c: Catalog, slug: string) => c.products.find((p) => p.slug === slug);
export const getCombo = (c: Catalog, slug: string) => c.combos.find((x) => x.slug === slug);

export function findSku(c: Catalog, code: string) {
  for (const product of c.products) {
    const sku = product.skus.find((s) => s.code === code);
    if (sku) return { product, sku };
  }
  return undefined;
}

export const formatINR = (paise: number) =>
  "₹" +
  (paise / 100).toLocaleString("en-IN", {
    minimumFractionDigits: paise % 100 ? 2 : 0,
    maximumFractionDigits: 2,
  });

// How full to draw the illustrated jar for a pack size: 1 kg ≈ full.
export const jarLevel = (grams: number) => Math.min(0.92, 0.18 + (0.74 * grams) / 1000);

// "28 October", in India time.
export const formatOfferDate = (iso: string) =>
  new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "long", timeZone: "Asia/Kolkata" }).format(new Date(iso));

// The earliest end date among combos on offer, if any has one.
export function offerEnds(combos: Combo[]) {
  const ends = combos.map((c) => c.endsAt).filter((e): e is string => !!e).sort();
  return ends[0] ?? null;
}

// "₹999" when every combo costs the same, otherwise "from ₹799".
export function comboPriceLabel(combos: Combo[]) {
  if (!combos.length) return null;
  const prices = combos.map((c) => c.price);
  const min = Math.min(...prices);
  return prices.every((p) => p === min) ? formatINR(min) : `from ${formatINR(min)}`;
}

// The sizes and prices every product shares, e.g. [{ label: "1 kg", price }],
// or null when products are priced differently.
export function sharedSizes(products: Product[]) {
  const first = products[0];
  if (!first) return null;
  const sig = (p: Product) => p.skus.map((s) => `${s.label}:${s.price}`).join("|");
  return products.every((p) => sig(p) === sig(first)) ? first.skus : null;
}

// Cart line identity. Prices are never stored with a line; they always
// come from the catalog (and the server re-prices at checkout).
export type CartLine = { kind: "product"; sku: string; qty: number } | { kind: "combo"; slug: string; qty: number };

export const lineKey = (l: CartLine) => (l.kind === "product" ? `p:${l.sku}` : `c:${l.slug}`);
