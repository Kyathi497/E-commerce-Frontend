import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { formatINR, formatOfferDate, getCombo, STORE } from "@/lib/catalog";
import { getCatalog } from "@/lib/catalog-data";
import { ComboArt } from "@/components/ComboArt";
import { ComboBuy } from "@/components/ComboBuy";
import { ComboCard } from "@/components/ComboCard";
import { Jar } from "@/components/Jar";

// Product and combo pages come from the catalog API, which isn't reachable at
// build time, so there are no prebuilt pages to start from: each page renders
// on request (from the cached catalog), and may block while it does.
export const instant = false;

export async function generateMetadata(props: PageProps<"/combos/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const c = getCombo(await getCatalog(), slug);
  return c ? { title: c.name, description: c.tagline } : {};
}

export default async function ComboPage(props: PageProps<"/combos/[slug]">) {
  const { slug } = await props.params;
  const catalog = await getCatalog();
  const combo = getCombo(catalog, slug);
  if (!combo) notFound();
  const others = catalog.combos.filter((c) => c.slug !== combo.slug);

  return (
    <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:pt-10">
      <Link href="/combos" className="mb-6 inline-flex items-center gap-1.5 text-sm text-ink-mute hover:text-leaf-900 hover:underline">
        <ArrowLeft className="size-4" aria-hidden /> All combos
      </Link>

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-14">
        <div
          className="relative aspect-square overflow-hidden rounded-[32px] px-[10%] pt-[14%] lg:sticky lg:top-28"
          style={{ background: combo.tint }}
        >
          <ComboArt combo={combo} className="size-full" />
          <p className="absolute bottom-4 left-0 right-0 text-center text-[12px] text-ink-mute">Illustration</p>
        </div>

        <div className="lg:py-6">
          {combo.endsAt && (
            <p className="inline-flex rounded-full bg-chilli-100 px-3 py-1 text-[13px] font-bold text-chilli-700">
              Limited offer · ends {formatOfferDate(combo.endsAt)}
            </p>
          )}
          <h1 className="mt-4 font-display text-4xl font-extrabold leading-[1.02] tracking-[-0.03em] text-leaf-900 sm:text-5xl">
            {combo.name}
          </h1>
          <p className="mt-3 text-[17px] text-ink-soft">{combo.tagline}</p>

          <p className="tabular mt-6 font-display text-5xl font-bold text-leaf-900">
            {formatINR(combo.price)}
            {combo.compareAt && (
              <s className="ml-3 align-middle font-sans text-xl font-medium text-ink-mute">{formatINR(combo.compareAt)}</s>
            )}
          </p>
          <p className="mt-1 text-sm text-ink-mute">+ flat {formatINR(STORE.shippingFlat)} shipping per order</p>

          <h2 className="mt-8 font-display text-xl font-bold text-leaf-900">In the box</h2>
          <ul className="mt-3 divide-y divide-line rounded-[24px] border border-line">
            {combo.items.map((p) => {
              return (
                <li key={p.slug} className="flex items-center gap-4 px-4 py-3">
                  <span className="grid size-14 shrink-0 place-items-center rounded-xl" style={{ background: p.tint }}>
                    <Jar fill={p.fill} fillDeep={p.fillDeep} texture={p.texture} label={false} className="h-12" />
                  </span>
                  <Link href={`/products/${p.slug}`} className="flex-1 font-semibold hover:underline">
                    {p.name}
                    <span lang="te" className="block font-telugu text-sm font-normal text-ink-mute">
                      {p.telugu}
                    </span>
                  </Link>
                  <span className="tabular text-ink-soft">{p.qty}</span>
                </li>
              );
            })}
            {combo.extras.map((e) => (
              <li key={e} className="flex items-center justify-between px-4 py-3 text-leaf-800">
                <span className="font-semibold">{e}</span>
                <span className="text-sm font-semibold">Included</span>
              </li>
            ))}
          </ul>

          <div className="mt-6">
            <ComboBuy combo={combo} />
          </div>
          <p className="mt-4 text-[15px] text-ink-mute">
            Every jar in this combo is prepared after you order, packed with care and sent straight to you.
          </p>
        </div>
      </div>

      {others.length > 0 && (
        <section aria-labelledby="more" className="mt-24">
          <h2 id="more" className="font-display text-2xl font-bold text-leaf-900 sm:text-3xl">
            Other combos
          </h2>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {others.map((c) => (
              <ComboCard key={c.slug} combo={c} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
