// Shown while a page's catalog data arrives (pages read it at request time).
export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:pt-14" aria-busy="true" aria-label="Loading">
      <div className="h-12 w-2/3 max-w-md animate-pulse rounded-2xl bg-leaf-50" />
      <div className="mt-4 h-5 w-full max-w-xl animate-pulse rounded-full bg-leaf-50" />
      <div className="mt-10 grid grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-6 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="aspect-[4/5] animate-pulse rounded-[22px] bg-leaf-50" />
        ))}
      </div>
    </div>
  );
}
