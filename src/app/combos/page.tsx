import type { Metadata } from "next";
import { comboPriceLabel, formatINR, formatOfferDate, offerEnds, STORE } from "@/lib/catalog";
import { getCatalog } from "@/lib/catalog-data";
import { ComboCard } from "@/components/ComboCard";

export const metadata: Metadata = {
  title: "Combos",
  description: "Daily Nutrition, Daily Essentials and the Tej Gift Hamper: fresh jars packed together, for a limited time.",
};

export default async function CombosPage() {
  const { combos } = await getCatalog();
  const price = comboPriceLabel(combos);
  const ends = offerEnds(combos);
  return (
    <div className="bg-leaf-800 pb-20 text-white">
      <div className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:pt-14">
        <h1 className="font-display text-4xl font-extrabold tracking-[-0.03em] sm:text-5xl">
          {price ? (
            <>
              Combos {price.startsWith("from") ? "" : "at "}
              <span className="text-turmeric-300">{price}</span>
            </>
          ) : (
            "Combos"
          )}
        </h1>
        <p className="mt-3 max-w-[60ch] text-[17px] text-leaf-100">
          {ends && `Limited offer until ${formatOfferDate(ends)}. `}Each combo is prepared fresh after you order, with a
          free jute bag. Flat {formatINR(STORE.shippingFlat)} shipping.
        </p>
        {combos.length === 0 && (
          <p className="mt-10 rounded-[24px] bg-white/10 p-6 text-[17px]">
            The combo offer has ended. Every jar is still in the shop, made fresh after you order.
          </p>
        )}
        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {combos.map((c) => (
            <ComboCard key={c.slug} combo={c} />
          ))}
        </div>
      </div>
    </div>
  );
}
