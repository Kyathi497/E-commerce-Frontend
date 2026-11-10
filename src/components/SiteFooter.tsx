import Link from "next/link";
import { Suspense } from "react";
import { STORE } from "@/lib/catalog";
import { getCatalogOrNull } from "@/lib/catalog-data";
import { BadgeLogo } from "./BadgeLogo";
import { WhatsAppIcon } from "./icons";

export function SiteFooter() {
  return (
    <footer className="mt-24 bg-leaf-900 text-leaf-100">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-3">
            <BadgeLogo className="size-14" title="" />
            <p className="font-script text-3xl text-white">Tej Organics</p>
          </div>
          <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-leaf-100/85">
            Freshly prepared after every order, packed with care and sent straight to you from our kitchen in{" "}
            {STORE.city}.
          </p>
          <a
            href={`https://wa.me/${STORE.whatsapp}`}
            className="mt-6 inline-flex items-center gap-2.5 rounded-full bg-white/10 px-4 py-2.5 font-semibold text-white hover:bg-white/15"
          >
            <WhatsAppIcon className="size-5" />
            Order or ask on WhatsApp · {STORE.phone}
          </a>
        </div>

        <nav aria-label="Shop">
          <h2 className="font-display text-lg font-bold text-white">Shop</h2>
          <ul className="mt-4 space-y-2.5 text-[15px]">
            <li>
              <Link href="/shop" className="hover:text-white hover:underline">
                All products
              </Link>
            </li>
            <Suspense>
              <CategoryLinks />
            </Suspense>
            <li>
              <Link href="/combos" className="hover:text-white hover:underline">
                Combos
              </Link>
            </li>
            <li>
              <Link href="/track" className="hover:text-white hover:underline">
                Track your order
              </Link>
            </li>
          </ul>
        </nav>

        <div>
          <h2 className="font-display text-lg font-bold text-white">Registered & certified</h2>
          <ul className="mt-4 space-y-3 text-[15px]">
            {STORE.registrations.map((r) => (
              <li key={r.name}>
                <p className="font-semibold text-white">{r.name}</p>
                <p className="tabular text-sm text-leaf-100/75">{r.detail}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-sm text-leaf-100/70 sm:px-6 md:flex-row md:justify-between">
          <p>{STORE.address}</p>
          <p>© 2026 Tej Organics</p>
        </div>
      </div>
    </footer>
  );
}

async function CategoryLinks() {
  const catalog = await getCatalogOrNull();
  return catalog?.categories.map((c) => (
    <li key={c.slug}>
      <Link href={`/shop?category=${c.slug}`} className="hover:text-white hover:underline">
        {c.name}
      </Link>
    </li>
  ));
}
