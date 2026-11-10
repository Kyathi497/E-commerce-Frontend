"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, ShoppingBag, X } from "lucide-react";
import { BadgeLogo } from "./BadgeLogo";
import { useCart } from "./cart/CartProvider";
import { AccountMenu } from "./auth/AccountMenu";

const NAV = [
  { href: "/shop", label: "Shop all" },
  { href: "/combos", label: "Combos" },
  { href: "/our-promise", label: "Our promise" },
  { href: "/contact", label: "Contact" },
];

export function Wordmark({ light = false }: { light?: boolean }) {
  return (
    <span className={`flex items-baseline gap-1.5 leading-none ${light ? "text-white" : "text-leaf-800"}`}>
      <span className="font-script text-[28px]">Tej</span>
      <span className="font-display text-[15px] font-bold tracking-[0.14em]">ORGANICS</span>
    </span>
  );
}

export function SiteHeader() {
  const { count, ready, setOpen } = useCart();
  const [menu, setMenu] = useState(false);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:gap-6 sm:px-6 lg:h-[72px]">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Tej Organics home">
          <BadgeLogo className="size-11 lg:size-12" title="" />
          <Wordmark />
        </Link>

        <nav aria-label="Main" className="ml-6 hidden md:block">
          <ul className="flex items-center gap-1">
            {NAV.map((n) => {
              const active = pathname === n.href || pathname.startsWith(n.href + "/");
              return (
                <li key={n.href}>
                  <Link
                    href={n.href}
                    aria-current={active ? "page" : undefined}
                    className={`rounded-full px-3.5 py-2 text-[15px] font-medium transition-colors ${
                      active ? "bg-leaf-100 text-leaf-900" : "text-ink-soft hover:bg-leaf-50 hover:text-leaf-900"
                    }`}
                  >
                    {n.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <AccountMenu />
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="relative flex h-11 w-11 items-center justify-center gap-2 rounded-full bg-leaf-800 text-[15px] sm:w-auto sm:pl-3.5 sm:pr-4 font-semibold text-white transition-colors hover:bg-leaf-900"
            aria-label={`Open cart, ${count} ${count === 1 ? "item" : "items"}`}
          >
            <ShoppingBag className="size-[18px]" strokeWidth={2} aria-hidden />
            <span className="hidden sm:inline">Cart</span>
            <span
              className={`tabular absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full px-1 text-[12px] font-bold ring-2 ring-white sm:static sm:h-auto sm:min-w-6 sm:px-1.5 sm:text-[13px] sm:ring-0 ${
                count > 0 ? "bg-turmeric-500 text-leaf-950" : "bg-white/15 text-white max-sm:hidden"
              }`}
            >
              {ready ? count : 0}
            </span>
          </button>
          <button
            type="button"
            className="grid size-11 place-items-center rounded-full text-leaf-900 hover:bg-leaf-50 md:hidden"
            aria-expanded={menu}
            aria-controls="mobile-nav"
            aria-label={menu ? "Close menu" : "Open menu"}
            onClick={() => setMenu((m) => !m)}
          >
            {menu ? <X className="size-6" aria-hidden /> : <Menu className="size-6" aria-hidden />}
          </button>
        </div>
      </div>

      {menu && (
        <nav id="mobile-nav" aria-label="Main" className="border-t border-line bg-white md:hidden">
          <ul className="mx-auto max-w-7xl px-4 py-2">
            {NAV.map((n) => (
              <li key={n.href}>
                <Link
                  href={n.href}
                  onClick={() => setMenu(false)}
                  className="flex items-center border-b border-line py-3.5 text-[17px] font-medium text-leaf-900 last:border-0"
                >
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
