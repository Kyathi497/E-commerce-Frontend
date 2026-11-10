// The cart as cart-service sends it (GET /api/v1/cart): every price,
// discount, stock level and shipping charge already worked out on the
// server. Money is integer paise.

export type Stock = "in_stock" | "low" | "out" | "unknown";

interface LineBase {
  key: string;
  qty: number;
  discountPaise: number;
  stock: Stock;
  priceChange: { fromPaise: number; toPaise: number } | null;
}

type LineIdentity = { kind: "product"; sku: string } | { kind: "combo"; slug: string };

export type ServerLine = LineBase &
  LineIdentity &
  (
    | { status: "ok"; name: string; detail: string; unitPaise: number; mrpPaise: number; lineTotalPaise: number }
    | { status: "not_found" | "unavailable" }
  );

export type OkLine = Extract<ServerLine, { status: "ok" }>;

export type CartCoupon =
  | { code: string; applied: true; description: string | null; discountPaise: number; freeShipping: boolean }
  | { code: string; applied: false; reason: string; message: string };

export interface Delivery {
  pincode: string;
  serviceable: boolean | null;
  codAvailable: boolean;
  minDays: number | null;
  maxDays: number | null;
  message: string;
}

export interface ServerCart {
  lines: ServerLine[];
  coupon: CartCoupon | null;
  offers: { name: string; description: string | null; discountPaise: number; freeShipping: boolean }[];
  pincode: string | null;
  delivery: Delivery | null;
  totals: {
    itemCount: number;
    subtotalPaise: number;
    discountPaise: number;
    shippingPaise: number;
    shippingDiscountPaise: number;
    totalPaise: number;
  };
  currency: "INR";
  notices: { code: string; message: string }[];
  canCheckout: boolean;
}

export const isOk = (l: ServerLine): l is OkLine => l.status === "ok";

// Why checkout is blocked, in the shopper's words, or null.
export function checkoutProblem(cart: ServerCart): string | null {
  const gone = cart.lines.filter((l) => !isOk(l));
  if (gone.length) return "Some items are no longer sold. Remove them to continue.";
  const out = cart.lines.filter((l): l is OkLine => isOk(l) && l.stock === "out");
  if (out.length) {
    return `${out.map((l) => l.name).join(", ")} just sold out. Remove ${out.length > 1 ? "them" : "it"} from your cart to continue.`;
  }
  if (cart.delivery?.serviceable === false) return cart.delivery.message;
  return null;
}
