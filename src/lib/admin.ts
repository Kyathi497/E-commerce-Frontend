// Shapes of the admin APIs the /admin screens use, and helpers they share.
import type { OrderAddress, OrderStatus, OrderSummary, OrderTotals } from "./orders";

// --- orders (order-service /admin/orders) ---

export interface AdminOrderSummary extends OrderSummary {
  id: string;
  contact: { name: string; phone: string; email: string | null };
  city: string | null;
  pincode: string | null;
  couponCode: string | null;
}

export interface AdminPayment {
  id: string;
  orderId: string;
  orderNumber: string;
  provider: "razorpay" | "test" | "cod";
  providerOrderId: string | null;
  providerPaymentId: string | null;
  amountPaise: number;
  status: "created" | "authorized" | "captured" | "failed" | "refunded" | "partially_refunded";
  method: string | null;
  failureReason: string | null;
  refundedPaise: number;
  capturedAt: string | null;
  createdAt: string;
  refunds?: {
    id: string;
    amountPaise: number;
    reason: string;
    status: string;
    failureReason: string | null;
    createdAt: string;
  }[];
}

export interface AdminOrder {
  id: string;
  number: string;
  status: OrderStatus;
  version: number;
  paymentMethod: "prepaid" | "cod";
  userId: string | null;
  contact: { name: string; phone: string; email: string | null };
  placedAt: string;
  confirmedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  totals: OrderTotals;
  tax: unknown;
  placeOfSupply: string | null;
  couponCode: string | null;
  shippingAddress: OrderAddress;
  customerNote: string | null;
  items: {
    kind: "sku" | "bundle";
    ref: string;
    name: string;
    detail: string;
    qty: number;
    unitPaise: number;
    discountPaise: number;
    lineTotalPaise: number;
    hsnCode: string | null;
    gstRateBp: number;
    taxPaise: number;
    components: { name?: string; label?: string; grams?: number }[] | null;
  }[];
  history: { from: OrderStatus | null; to: OrderStatus; actor: string; reason: string | null; at: string }[];
  notes: { kind: string; actorId: string | null; body: string; at: string }[];
  payment: AdminPayment | null | { unavailable: true };
}

export const ORDER_STATUSES: OrderStatus[] = [
  "PENDING_PAYMENT",
  "CONFIRMED",
  "PREPARING",
  "PACKED",
  "SHIPPED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
  "REFUND_PENDING",
  "REFUNDED",
  "RETURN_REQUESTED",
  "RETURNED",
  "RTO",
];

// The moves the owner can make by hand, as order-service allows them
// (states.ts: MOVES minus the system-only ones and CANCELLED, which has its
// own action). The server checks again.
export const ADMIN_MOVES: Partial<Record<OrderStatus, OrderStatus[]>> = {
  CONFIRMED: ["PREPARING", "PACKED"],
  PREPARING: ["PACKED"],
  PACKED: ["SHIPPED"],
  SHIPPED: ["OUT_FOR_DELIVERY", "DELIVERED", "RTO"],
  OUT_FOR_DELIVERY: ["DELIVERED", "RTO"],
  DELIVERED: ["RETURN_REQUESTED"],
  RETURN_REQUESTED: ["RETURNED", "DELIVERED"],
};

export const ADMIN_CANCELLABLE: OrderStatus[] = ["PENDING_PAYMENT", "CONFIRMED", "PREPARING", "PACKED"];

// Owner-facing names, plainer than the customer labels.
export const STATUS_NAME: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "Awaiting payment",
  CONFIRMED: "Confirmed",
  PREPARING: "Preparing",
  PACKED: "Packed",
  SHIPPED: "Shipped",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  REFUND_PENDING: "Refund pending",
  REFUNDED: "Refunded",
  RETURN_REQUESTED: "Return requested",
  RETURNED: "Returned",
  RTO: "RTO",
};

// --- catalog (catalog-service /admin) ---

export type CatalogStatus = "draft" | "active" | "archived";

export interface AdminSku {
  id: string;
  code: string;
  label: string;
  netGrams: number;
  mrpPaise: number;
  pricePaise: number;
  status: CatalogStatus;
  sortOrder: number;
  version: number;
}

export interface AdminProduct {
  id: string;
  slug: string;
  name: string;
  nameTe: string;
  category: { slug: string; name: string };
  categoryId: string;
  short: string;
  description: string;
  uses: string[];
  texture: "powder" | "paste" | "honey" | "ghee";
  colors: { fill: string; fillDeep: string; tint: string };
  hsnCode: string | null;
  gstRateBp: number | null;
  seoTitle: string | null;
  seoDescription: string | null;
  status: CatalogStatus;
  sortOrder: number;
  version: number;
  updatedAt: string;
  skus: AdminSku[];
  images: { id: string; alt: string; src: string; srcSet: string }[];
}

export interface AdminCategory {
  id: string;
  slug: string;
  name: string;
  sortOrder: number;
  status: CatalogStatus;
  productCount: number;
}

export interface AdminBundle {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  pricePaise: number;
  compareAtPaise: number | null;
  tint: string;
  extras: string[];
  availableFrom: string | null;
  availableUntil: string | null;
  status: CatalogStatus;
  sortOrder: number;
  version: number;
  images: { id: string; alt: string; src: string; srcSet: string }[];
  items: { productId: string; slug: string; name: string; grams: number; label: string }[];
}

// --- inventory (inventory-service /admin/stock) ---

export interface StockItem {
  id: string;
  kind: "product" | "packaging";
  refId: string;
  name: string;
  unit: string;
  onHand: number;
  reserved: number;
  available: number;
  lowStockThreshold: number;
  level: "in_stock" | "low" | "out";
  status: "active" | "archived";
  version: number;
  updatedAt: string;
}

export interface StockMovement {
  id: string;
  onHandDelta: number;
  reservedDelta: number;
  reason: string;
  note: string | null;
  actorId: string | null;
  // What caused it, e.g. a reservation's order id.
  refType: string | null;
  refId: string | null;
  at: string;
}

// --- promotions (promotion-service /admin) ---

export type PromoStatus = "active" | "paused" | "archived";

export type AppliesTo = { kind: "all" } | { kind: "products" | "categories" | "bundles"; ids: string[] };

export interface Coupon {
  id: string;
  code: string;
  description: string | null;
  type: "percent" | "flat" | "free_shipping";
  value: number;
  minSubtotalPaise: number | null;
  maxDiscountPaise: number | null;
  startsAt: string | null;
  endsAt: string | null;
  usageLimit: number | null;
  perUserLimit: number | null;
  firstOrderOnly: boolean;
  appliesTo: AppliesTo;
  stackable: boolean;
  status: PromoStatus;
  version: number;
  usage: { reserved: number; confirmed: number };
}

export type AutoRule =
  | { type: "qty_percent"; minQty: number; percent: number; appliesTo: AppliesTo }
  | { type: "subtotal_percent"; minSubtotalPaise: number; percent: number; maxDiscountPaise?: number }
  | { type: "free_shipping"; minSubtotalPaise: number };

export interface AutoPromotion {
  id: string;
  name: string;
  description: string | null;
  rule: AutoRule;
  startsAt: string | null;
  endsAt: string | null;
  priority: number;
  status: PromoStatus;
  version: number;
}

// --- customers (auth-service /admin/users) ---

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: "user" | "admin";
  emailVerified: boolean;
  hasPassword: boolean;
  googleLinked: boolean;
  marketingOptIn: boolean;
  createdAt: string;
  status: "active" | "locked" | "deleted";
  failedLogins: number;
  lockedUntil: string | null;
}

// --- money in forms ---

// "1,299.50" → 129950; null when it isn't an amount.
export function rupeesToPaise(value: string): number | null {
  const clean = value.replace(/[₹,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(clean)) return null;
  return Math.round(Number(clean) * 100);
}

export const paiseToRupees = (paise: number | null | undefined) =>
  paise === null || paise === undefined ? "" : (paise / 100).toFixed(paise % 100 === 0 ? 0 : 2);

// <input type="datetime-local"> works in local time; the API in ISO/UTC.
export function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export const fromLocalInput = (value: string) => (value ? new Date(value).toISOString() : null);

export const formatGrams = (g: number) => (g >= 1000 ? `${(g / 1000).toLocaleString("en-IN", { maximumFractionDigits: 2 })} kg` : `${g} g`);

export const formatQty = (n: number, unit: string) => (unit === "g" ? formatGrams(n) : `${n.toLocaleString("en-IN")} ${unit}`);
