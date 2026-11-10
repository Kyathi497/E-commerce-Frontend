import Link from "next/link";
import { Suspense } from "react";
import { comboPriceLabel, formatINR, formatOfferDate, offerEnds, STORE } from "@/lib/catalog";
import { getCatalogOrNull } from "@/lib/catalog-data";

const shipping = `Flat ${formatINR(STORE.shippingFlat)} shipping on every order`;

export function OfferStrip() {
  return (
    <div className="bg-leaf-950 text-[13px] text-leaf-100">
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-x-5 px-4 py-2 text-center">
        <Suspense fallback={<p>{shipping}</p>}>
          <Offer />
        </Suspense>
      </div>
    </div>
  );
}

async function Offer() {
  const combos = (await getCatalogOrNull())?.combos ?? [];
  const price = comboPriceLabel(combos);
  const ends = offerEnds(combos);
  if (!price) return <p>{shipping}</p>;
  return (
    <>
      <p>
        <span className="font-semibold text-turmeric-300">{price} combos</span>
        {ends && <> until {formatOfferDate(ends)}</>}
        <span className="hidden sm:inline">
          {" · "}
          {shipping}
        </span>
      </p>
      <Link href="/combos" className="hidden font-semibold text-white underline md:inline">
        See combos
      </Link>
    </>
  );
}
