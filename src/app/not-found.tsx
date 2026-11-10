import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="font-display text-4xl font-extrabold text-leaf-900">We couldn&apos;t find that page</h1>
      <p className="mt-3 text-ink-soft">The link may be old, or the product may have moved.</p>
      <Link href="/shop" className="mt-8 inline-flex rounded-full bg-turmeric-500 px-6 py-3 font-semibold text-leaf-950 hover:bg-turmeric-600">
        Browse all products
      </Link>
    </div>
  );
}
