"use client";

import { STORE } from "@/lib/catalog";
import { WhatsAppIcon } from "@/components/icons";

// A page couldn't load, most often because the shop's backend is briefly unreachable.
export default function PageError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="font-display text-4xl font-extrabold text-leaf-900">The shop didn&apos;t load</h1>
      <p className="mt-3 text-ink-soft">
        Something went wrong on our side. Please try again in a minute. Your cart is saved.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={() => retry()}
          className="rounded-full bg-turmeric-500 px-6 py-3 font-semibold text-leaf-950 hover:bg-turmeric-600"
        >
          Try again
        </button>
        <a
          href={`https://wa.me/${STORE.whatsapp}`}
          className="flex items-center gap-2 rounded-full border-2 border-leaf-800 px-5 py-3 font-semibold text-leaf-900 hover:bg-leaf-50"
        >
          <WhatsAppIcon className="size-5" /> Order on WhatsApp
        </a>
      </div>
    </div>
  );
}
