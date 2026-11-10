"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  Boxes,
  CreditCard,
  FolderTree,
  Gift,
  LayoutDashboard,
  Loader2,
  Package,
  ShoppingBasket,
  Tag,
  Ticket,
  Users,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { loginHref } from "@/components/auth/AccountMenu";

const NAV = [
  { href: "/admin", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/admin/orders", label: "Orders", Icon: ShoppingBasket },
  { href: "/admin/payments", label: "Payments", Icon: CreditCard },
  { href: "/admin/products", label: "Products", Icon: Package },
  { href: "/admin/combos", label: "Combos", Icon: Gift },
  { href: "/admin/categories", label: "Categories", Icon: FolderTree },
  { href: "/admin/inventory", label: "Inventory", Icon: Boxes },
  { href: "/admin/coupons", label: "Coupons", Icon: Ticket },
  { href: "/admin/offers", label: "Offers", Icon: Tag },
  { href: "/admin/customers", label: "Customers", Icon: Users },
];

// The admin role is checked here for the UI, in proxy.ts before the page
// loads, and on every call by the gateway and the service.
export function AdminShell({ children }: { children: React.ReactNode }) {
  const { user, ready } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (ready && !user) router.replace(loginHref(pathname));
  }, [ready, user, pathname, router]);

  if (!ready || !user) {
    return (
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-20 text-ink-soft sm:px-6" role="status">
        <Loader2 className="size-5 animate-spin" aria-hidden /> Loading…
      </div>
    );
  }

  if (user.role !== "admin") {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <h1 className="font-display text-3xl font-bold text-leaf-900">This area is for the store team</h1>
        <p className="mt-2 text-ink-soft">Your account doesn&apos;t have admin access.</p>
        <Link href="/" className="mt-6 inline-flex rounded-full bg-turmeric-500 px-6 py-3 font-semibold text-leaf-950">
          Back to the store
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-[1400px] gap-6 px-4 pb-20 pt-6 sm:px-6 lg:grid-cols-[200px_1fr] lg:gap-10 lg:pt-8">
      <nav aria-label="Admin" className="lg:sticky lg:top-24 lg:h-fit">
        <p className="mb-2 hidden px-3 text-[13px] font-semibold uppercase tracking-[0.08em] text-ink-mute lg:block">Store admin</p>
        <ul className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-col lg:px-0">
          {NAV.map(({ href, label, Icon }) => {
            const active = href === "/admin" ? pathname === href : pathname === href || pathname.startsWith(href + "/");
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`flex h-10 items-center gap-2.5 whitespace-nowrap rounded-lg px-3 text-[15px] font-semibold transition-colors ${
                    active ? "bg-leaf-800 text-white" : "text-leaf-900 hover:bg-leaf-50"
                  }`}
                >
                  <Icon className="size-[18px]" aria-hidden />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
