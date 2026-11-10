// Shapes of order-service's customer answers (GET /orders, GET /orders/:number,
// POST /orders/track), and small helpers shared by the account pages.

export type OrderStatus =
  | "PENDING_PAYMENT"
  | "CONFIRMED"
  | "PREPARING"
  | "PACKED"
  | "SHIPPED"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED"
  | "REFUND_PENDING"
  | "REFUNDED"
  | "RETURN_REQUESTED"
  | "RETURNED"
  | "RTO";

export interface OrderSummary {
  number: string;
  status: OrderStatus;
  statusLabel: string;
  paymentMethod: "prepaid" | "cod";
  placedAt: string;
  totalPaise: number;
  itemCount: number;
  items: string[];
}

export interface OrderItem {
  kind: "sku" | "bundle";
  ref: string;
  name: string;
  detail: string;
  qty: number;
  unitPaise: number;
  mrpPaise: number;
  discountPaise: number;
  lineTotalPaise: number;
}

export interface OrderAddress {
  name: string;
  phone?: string;
  line1: string;
  line2?: string | null;
  landmark?: string | null;
  city: string;
  state: string;
  pincode: string;
}

export interface OrderTotals {
  subtotalPaise: number;
  discountPaise: number;
  shippingPaise: number;
  shippingDiscountPaise: number;
  taxPaise: number;
  totalPaise: number;
}

export interface OrderDetail {
  number: string;
  status: OrderStatus;
  statusLabel: string;
  paymentMethod: "prepaid" | "cod";
  placedAt: string;
  confirmedAt: string | null;
  cancelledAt: string | null;
  totals: OrderTotals;
  couponCode: string | null;
  items: OrderItem[];
  // Left out of guest tracking answers.
  shippingAddress?: OrderAddress;
  contact?: { name: string; phone: string; email: string | null };
  timeline?: { status: OrderStatus; label: string; at: string }[];
  canCancel: boolean;
}

// The steps a good order walks through, for the progress line.
export const JOURNEY: { status: OrderStatus; label: string }[] = [
  { status: "CONFIRMED", label: "Confirmed" },
  { status: "PREPARING", label: "Being prepared" },
  { status: "PACKED", label: "Packed" },
  { status: "SHIPPED", label: "Shipped" },
  { status: "OUT_FOR_DELIVERY", label: "Out for delivery" },
  { status: "DELIVERED", label: "Delivered" },
];

// Off the happy path: the progress line gives way to a plain notice.
export const ENDED: OrderStatus[] = ["CANCELLED", "REFUND_PENDING", "REFUNDED", "RETURN_REQUESTED", "RETURNED", "RTO"];

export type Tone = "wait" | "good" | "done" | "stop";

export function statusTone(status: OrderStatus): Tone {
  if (status === "DELIVERED") return "done";
  if (status === "PENDING_PAYMENT") return "wait";
  if (ENDED.includes(status)) return "stop";
  return "good";
}

export const TONE_CLASS: Record<Tone, string> = {
  wait: "bg-turmeric-100 text-leaf-950",
  good: "bg-leaf-100 text-leaf-900",
  done: "bg-leaf-800 text-white",
  stop: "bg-chilli-100 text-chilli-700",
};

const dateFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
const timeFmt = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Asia/Kolkata",
});

export const formatDate = (iso: string) => dateFmt.format(new Date(iso));
export const formatDateTime = (iso: string) => timeFmt.format(new Date(iso));

export function addressLines(a: OrderAddress) {
  return [a.line1, a.line2, a.landmark, `${a.city}, ${a.state} ${a.pincode}`].filter(Boolean) as string[];
}
