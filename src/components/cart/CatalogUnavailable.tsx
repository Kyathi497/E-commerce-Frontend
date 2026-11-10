import { STORE } from "@/lib/catalog";

// Shown where prices are needed but the catalog couldn't be loaded.
export function CatalogUnavailable({ className = "" }: { className?: string }) {
  return (
    <div role="alert" className={`rounded-[20px] bg-chilli-100 px-5 py-4 text-[15px] text-chilli-700 ${className}`}>
      <p className="font-semibold">We couldn&apos;t load prices just now.</p>
      <p className="mt-1">
        Your cart is saved. Please refresh in a minute, or order on WhatsApp at {STORE.phone}.
      </p>
    </div>
  );
}
