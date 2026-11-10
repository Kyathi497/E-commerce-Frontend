import { Suspense } from "react";
import { CatalogJar } from "@/components/CatalogJar";

// Shared frame for /login and /register: the form, then a leaf panel showing
// what an account is for (details ready at checkout).
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto grid max-w-6xl gap-12 px-4 pb-16 pt-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-start lg:gap-16 lg:pb-24 lg:pt-14">
      <div className="mx-auto w-full max-w-md lg:mx-0 lg:justify-self-end">{children}</div>

      <aside
        aria-labelledby="auth-why"
        className="relative overflow-hidden rounded-[32px] bg-leaf-800 px-6 lg:sticky lg:top-28 pb-0 pt-8 text-white sm:px-10 sm:pt-10"
      >
        <svg aria-hidden viewBox="0 0 400 200" className="absolute -right-16 -top-10 w-[80%] text-leaf-700" fill="currentColor">
          <path d="M210 10c60 0 150 30 170 110-60-30-120-20-170 10-40-40-90-50-150-20C80 40 150 10 210 10z" />
        </svg>
        <div className="relative">
          <h2 id="auth-why" className="max-w-[16ch] font-display text-3xl font-bold tracking-[-0.02em] sm:text-4xl">
            Your details, ready at checkout.
          </h2>
          <p className="mt-3 max-w-[40ch] text-[16px] leading-relaxed text-leaf-100">
            Add your delivery address once. Next time it&apos;s already filled in, so a reorder takes a minute. Guest
            checkout still works if you&apos;d rather not sign up.
          </p>
        </div>

        <div className="relative mt-8 grid grid-cols-[1fr_auto] items-end gap-2 sm:mt-10">
          <figure className="mb-8 rounded-2xl bg-white p-4 text-ink shadow-[0_14px_34px_rgba(8,26,15,0.35)] sm:mb-12 sm:p-5">
            <figcaption className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[13px] font-medium text-ink-mute">
              Saved for checkout
              <span className="rounded-full bg-leaf-100 px-2 py-0.5 text-[12px] font-semibold text-leaf-900">Example</span>
            </figcaption>
            <p className="mt-2 font-display text-lg font-bold text-leaf-900">Lakshmi Prasanna</p>
            <p className="tabular text-[15px] text-ink-soft">+91 98480 •• •••</p>
            <p className="mt-1 text-[15px] leading-snug text-ink-soft">
              12-4-7, Gandhi Nagar
              <br />
              Vijayawada
              <br />
              Andhra Pradesh 520003
            </p>
          </figure>
          <div className="flex w-[96px] items-end sm:w-[200px]">
            <Suspense>
              <CatalogJar slug="buffalo-ghee" level={0.82} className="-mr-[22%] w-[62%]" />
              <CatalogJar slug="turmeric-powder" level={0.9} className="relative z-10 w-[72%]" />
            </Suspense>
          </div>
        </div>
        <div className="relative -mx-6 h-3 bg-leaf-950/40 sm:-mx-10" aria-hidden />
      </aside>
    </div>
  );
}
