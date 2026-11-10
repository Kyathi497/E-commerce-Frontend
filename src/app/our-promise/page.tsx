import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import { Suspense } from "react";
import { STORE } from "@/lib/catalog";
import { StageStrip } from "@/components/StageStrip";
import { CatalogJar } from "@/components/CatalogJar";

export const metadata: Metadata = {
  title: "Our promise",
  description: "Freshly prepared after every order, packed with care and sent straight to you.",
};

const IN = ["100% natural ingredients", "Handpicked quality", "Homemade goodness"];
const OUT = ["No added preservatives", "No artificial colours", "No old stock sitting in a warehouse"];

export default function PromisePage() {
  return (
    <>
      <section className="mx-auto grid max-w-7xl gap-10 px-4 pt-10 sm:px-6 lg:grid-cols-[1.2fr_1fr] lg:items-center lg:pt-16">
        <div>
          <h1 className="font-display text-5xl font-extrabold leading-[0.98] tracking-[-0.03em] text-leaf-900 sm:text-6xl">
            Goodness from nature, made with care.
          </h1>
          <p className="mt-6 max-w-[58ch] text-lg leading-relaxed text-ink-soft">
            Tej Organics is a young business from {STORE.city}. We don&apos;t make stock ahead and wait for buyers. We wait
            for your order, then prepare what you asked for, pack it in glass under a jute-cloth lid and send it straight to
            you.
          </p>
        </div>
        <div className="flex items-end justify-center gap-2 rounded-[32px] bg-leaf-100 px-8 pb-8 pt-12">
          <Suspense>
            <CatalogJar slug="sprouted-ragi-powder" level={0.88} className="w-[42%]" />
            <CatalogJar slug="buffalo-ghee" level={0.75} className="w-[42%]" />
          </Suspense>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-20 sm:px-6">
        <h2 className="font-display text-3xl font-bold text-leaf-900">How every order is made</h2>
        <div className="mt-10">
          <StageStrip />
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-10 px-4 pt-20 sm:px-6 md:grid-cols-2">
        <div className="rounded-[28px] bg-leaf-800 p-8 text-white">
          <h2 className="font-display text-2xl font-bold">What goes in</h2>
          <ul className="mt-5 space-y-3 text-[17px]">
            {IN.map((t) => (
              <li key={t} className="flex gap-3">
                <Check className="mt-0.5 size-5 shrink-0 text-turmeric-300" aria-hidden /> {t}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-[28px] bg-turmeric-100 p-8">
          <h2 className="font-display text-2xl font-bold text-leaf-900">What stays out</h2>
          <ul className="mt-5 space-y-3 text-[17px]">
            {OUT.map((t) => (
              <li key={t} className="flex gap-3">
                <Check className="mt-0.5 size-5 shrink-0 text-leaf-700" aria-hidden /> {t}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-20 sm:px-6">
        <h2 className="font-display text-3xl font-bold text-leaf-900">Registered and certified</h2>
        <dl className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STORE.registrations.map((r) => (
            <div key={r.name} className="border-t-2 border-leaf-800 pt-4">
              <dt className="font-display text-lg font-bold text-leaf-900">{r.name}</dt>
              <dd className="tabular mt-1 text-[15px] text-ink-mute">{r.detail}</dd>
            </div>
          ))}
        </dl>
        <Link
          href="/shop"
          className="mt-12 inline-flex h-14 items-center rounded-full bg-turmeric-500 px-7 text-[17px] font-bold text-leaf-950 hover:bg-turmeric-600"
        >
          Shop all products
        </Link>
      </section>
    </>
  );
}
