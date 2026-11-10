import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { comboPriceLabel, formatINR, formatOfferDate, getProduct, offerEnds, sharedSizes, STORE } from "@/lib/catalog";
import { getCatalog, getProductPage } from "@/lib/catalog-data";
import { Jar } from "@/components/Jar";
import { ProductCard } from "@/components/ProductCard";
import { ComboCard } from "@/components/ComboCard";
import { StageStrip } from "@/components/StageStrip";
import { WhatsAppIcon } from "@/components/icons";

const COUNT: Record<number, string> = { 2: "Two", 3: "Three", 4: "Four", 5: "Five", 6: "Six" };

const PROMISES = [
  "No added preservatives",
  "No artificial colours",
  "100% natural ingredients",
  "Hygienically packed in glass",
  "Prepared only after you order",
  "Best for everyday cooking",
];

export default async function Home() {
  const [catalog, firstPage] = await Promise.all([getCatalog(), getProductPage(10)]);
  const { products, combos, categories } = catalog;
  // The hero shelf: these three if they're on sale, otherwise the first three.
  const [honey, turmeric, moringa] = ["wild-forest-honey", "turmeric-powder", "moringa-wellness-powder"].map(
    (slug, i) => getProduct(catalog, slug) ?? products[i],
  );
  const sizes = sharedSizes(products);
  const comboPrice = comboPriceLabel(combos);
  const ends = offerEnds(combos);

  return (
    <>
      {/* Hero */}
      <section className="mx-auto grid max-w-7xl gap-8 px-4 pb-14 pt-8 sm:px-6 lg:grid-cols-12 lg:items-center lg:gap-10 lg:pb-20 lg:pt-12">
        <div className="lg:col-span-5">
          <h1 className="font-display text-[44px] font-extrabold leading-[0.98] tracking-[-0.03em] text-leaf-900 sm:text-6xl lg:text-[76px]">
            Made fresh after you order.
          </h1>
          <p className="mt-5 max-w-[46ch] text-[17px] leading-relaxed text-ink-soft lg:text-lg">
            Turmeric, spice powders, ginger-garlic paste, wild forest honey, buffalo ghee, moringa and sprouted ragi.
            Every jar is prepared once your order comes in, packed with care and sent straight to you.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/shop"
              className="flex h-14 items-center gap-2 rounded-full bg-turmeric-500 px-7 text-[17px] font-bold text-leaf-950 shadow-[0_6px_18px_rgba(217,154,0,0.35)] transition-colors hover:bg-turmeric-600"
            >
              Shop all products
              <ArrowRight className="size-5" aria-hidden />
            </Link>
            {comboPrice && (
              <Link
                href="/combos"
                className="flex h-14 items-center rounded-full border-2 border-leaf-800 px-6 text-[17px] font-semibold text-leaf-900 transition-colors hover:bg-leaf-50"
              >
                {comboPrice} combos
              </Link>
            )}
          </div>
          <p className="mt-6 flex flex-wrap gap-x-4 gap-y-1 text-sm font-medium text-ink-mute">
            <span>FSSAI registered</span>
            <span aria-hidden>·</span>
            <span>Certified organic</span>
            <span aria-hidden>·</span>
            <span>From {STORE.city}</span>
          </p>
        </div>

        <div className="relative lg:col-span-7">
          <div className="relative overflow-hidden rounded-[32px] bg-turmeric-500 px-5 pb-8 pt-24 sm:px-10 sm:pt-10 lg:pt-12">
            <svg aria-hidden viewBox="0 0 400 200" className="absolute -right-10 -top-6 w-[70%] text-turmeric-300" fill="currentColor">
              <path d="M210 10c60 0 150 30 170 110-60-30-120-20-170 10-40-40-90-50-150-20C80 40 150 10 210 10z" opacity=".55" />
            </svg>
            <div className="relative flex items-end justify-center">
              {honey && <Jar {...honey} level={0.85} className="-mr-[9%] w-[37%]" title={`${honey.name} jar`} />}
              {turmeric && <Jar {...turmeric} level={0.92} className="relative z-10 w-[46%]" title={`${turmeric.name} jar`} />}
              {moringa && <Jar {...moringa} level={0.8} className="-ml-[9%] w-[37%]" title={`${moringa.name} jar`} />}
            </div>
            <div className="relative -mt-[2.5%] h-3.5 rounded-full bg-[#C98A00]/50" aria-hidden />
          </div>
          {sizes && (
            <div className="absolute left-4 top-4 rounded-2xl bg-white px-4 py-2.5 shadow-[0_12px_30px_rgba(15,44,26,0.16)] sm:-bottom-5 sm:left-8 sm:top-auto sm:px-5 sm:py-3.5">
              <p className="text-[13px] font-medium text-ink-mute">Every product</p>
              <p className="tabular font-display text-lg font-bold text-leaf-900">
                {sizes.map((s, i) => (
                  <span key={s.code}>
                    {i > 0 && <span className="font-sans font-normal text-ink-mute"> · </span>}
                    {s.label} {formatINR(s.price)}
                  </span>
                ))}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* How freshness works */}
      <section aria-labelledby="fresh-title" className="bg-leaf-50 py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <h2 id="fresh-title" className="max-w-2xl font-display text-3xl font-bold tracking-[-0.02em] text-leaf-900 sm:text-4xl">
            No warehouse, no old stock. Your jar starts with your order.
          </h2>
          <div className="mt-12">
            <StageStrip />
          </div>
        </div>
      </section>

      {/* Products */}
      <section aria-labelledby="shop-title" className="mx-auto max-w-7xl px-4 pt-20 sm:px-6 lg:pt-24">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="shop-title" className="font-display text-3xl font-bold tracking-[-0.02em] text-leaf-900 sm:text-4xl">
              From our kitchen to yours
            </h2>
            {sizes && (
              <p className="mt-2 text-ink-soft">Every product comes in {sizes.map((s) => s.label).join(" and ")}.</p>
            )}
          </div>
          <nav aria-label="Categories" className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <Link
                key={c.slug}
                href={`/shop?category=${c.slug}`}
                className="rounded-full border border-line px-4 py-2 text-sm font-medium text-ink-soft hover:border-leaf-700 hover:text-leaf-900"
              >
                {c.name}
              </Link>
            ))}
          </nav>
        </div>
        <div className="mt-10 grid grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-6 sm:gap-y-12 lg:grid-cols-3">
          {firstPage.products.map((p) => (
            <ProductCard key={p.slug} product={p} />
          ))}
        </div>
        {firstPage.nextCursor && (
          <div className="mt-12 flex justify-center">
            <Link
              href="/shop"
              className="flex h-12 items-center gap-2 rounded-full border-2 border-leaf-800 px-7 text-base font-semibold text-leaf-900 transition-colors hover:bg-leaf-50"
            >
              Show more <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        )}
      </section>

      {/* Combos */}
      {combos.length > 0 && (
        <section aria-labelledby="combo-title" className="mt-24 bg-leaf-800 py-16 text-white lg:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 id="combo-title" className="font-display text-3xl font-bold tracking-[-0.02em] sm:text-4xl">
                  {combos.length === 1 ? "A combo" : `${COUNT[combos.length] ?? combos.length} combos`},{" "}
                  <span className="text-turmeric-300">{comboPrice?.startsWith("from") ? comboPrice : `${comboPrice} each`}</span>
                </h2>
                <p className="mt-2 text-leaf-100">
                  {ends && `Limited offer until ${formatOfferDate(ends)}. `}Every combo comes with a free jute bag.
                </p>
              </div>
              <Link href="/combos" className="flex items-center gap-1.5 font-semibold text-turmeric-300 hover:underline">
                Compare combos <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
            <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {combos.map((c) => (
                <ComboCard key={c.slug} combo={c} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Promise + proof */}
      <section aria-labelledby="promise-title" className="mx-auto grid max-w-7xl gap-12 px-4 pt-20 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:pt-24">
        <div>
          <h2 id="promise-title" className="font-display text-3xl font-bold tracking-[-0.02em] text-leaf-900 sm:text-4xl">
            Pure, natural, healthy. Nothing hidden in the jar.
          </h2>
          <ul className="mt-8 grid gap-x-8 gap-y-4 sm:grid-cols-2">
            {PROMISES.map((p) => (
              <li key={p} className="flex items-start gap-3 text-[17px] text-ink">
                <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-leaf-100 text-leaf-800">
                  <Check className="size-4" strokeWidth={2.6} aria-hidden />
                </span>
                {p}
              </li>
            ))}
          </ul>
          <Link href="/our-promise" className="mt-8 inline-flex items-center gap-1.5 font-semibold text-leaf-800 underline">
            Read our promise <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
        <div className="rounded-[28px] border border-line p-6 sm:p-8">
          <h3 className="font-display text-xl font-bold text-leaf-900">Registered and certified</h3>
          <dl className="mt-5 divide-y divide-line">
            {STORE.registrations.map((r) => (
              <div key={r.name} className="flex flex-col gap-0.5 py-3.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
                <dt className="font-semibold text-ink">{r.name}</dt>
                <dd className="tabular text-[15px] text-ink-mute sm:text-right">{r.detail}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Close */}
      <section className="mx-auto max-w-7xl px-4 pt-20 sm:px-6">
        <div className="flex flex-col items-start gap-6 rounded-[28px] bg-turmeric-100 p-8 sm:p-10 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold text-leaf-900 sm:text-3xl">Questions before you order?</h2>
            <p className="mt-1.5 text-ink-soft">Message or call us on WhatsApp about sizes, combos or delivery.</p>
          </div>
          <a
            href={`https://wa.me/${STORE.whatsapp}`}
            className="flex h-14 shrink-0 items-center gap-2.5 rounded-full bg-leaf-800 px-6 text-[17px] font-semibold text-white hover:bg-leaf-900"
          >
            <WhatsAppIcon className="size-5" />
            {STORE.phone}
          </a>
        </div>
      </section>
    </>
  );
}
