"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2, MapPin, Package, UserRound } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { loginHref } from "@/components/auth/AccountMenu";

const NAV = [
  { href: "/account/orders", label: "Orders", Icon: Package },
  { href: "/account/addresses", label: "Addresses", Icon: MapPin },
  { href: "/account", label: "Profile", Icon: UserRound },
];

// Everything under /account needs a signed-in shopper; the API checks again.
export function AccountShell({ children }: { children: React.ReactNode }) {
  const { user, ready } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (ready && !user) router.replace(loginHref(pathname));
  }, [ready, user, pathname, router]);

  if (!ready || !user) {
    return (
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-20 text-ink-soft sm:px-6" role="status">
        <Loader2 className="size-5 animate-spin" aria-hidden /> Loading your account…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pb-20 pt-10 sm:px-6 lg:pt-14">
      <p className="text-[15px] text-ink-mute">Your account</p>
      <h1 className="font-display text-4xl font-extrabold tracking-[-0.03em] text-leaf-900 sm:text-5xl">
        Namaste, {user.name.trim().split(/\s+/)[0]}
      </h1>

      <div className="mt-8 grid gap-8 lg:grid-cols-[220px_1fr] lg:gap-12">
        <nav aria-label="Account">
          <ul className="flex gap-2 overflow-x-auto lg:flex-col">
            {NAV.map(({ href, label, Icon }) => {
              const active = href === "/account" ? pathname === href : pathname === href || pathname.startsWith(href + "/");
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={`flex h-11 items-center gap-2.5 whitespace-nowrap rounded-full px-4 text-[15px] font-semibold transition-colors lg:rounded-xl ${
                      active ? "bg-leaf-800 text-white" : "text-leaf-900 hover:bg-leaf-50"
                    }`}
                  >
                    <Icon className="size-[18px]" aria-hidden />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}

// Section heading used by every account page.
export function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <h2 className="font-display text-2xl font-bold text-leaf-900">{children}</h2>
      {action}
    </div>
  );
}

export const inputClass = (invalid?: boolean) =>
  `mt-1.5 block h-12 w-full rounded-xl border bg-white px-4 text-[16px] text-ink placeholder:text-ink-mute focus:border-leaf-700 focus:outline-none focus:ring-2 focus:ring-leaf-200 disabled:bg-leaf-50 disabled:text-ink-soft ${
    invalid ? "border-chilli-700" : "border-line"
  }`;

export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1.5 text-sm font-medium text-chilli-700">
      {message}
    </p>
  );
}

export function Notice({ kind, children }: { kind: "ok" | "error"; children: React.ReactNode }) {
  return (
    <p
      role={kind === "error" ? "alert" : "status"}
      className={`rounded-xl px-4 py-3 text-[15px] font-medium ${kind === "error" ? "bg-chilli-100 text-chilli-700" : "bg-leaf-100 text-leaf-900"}`}
    >
      {children}
    </p>
  );
}

export const primaryButton =
  "inline-flex h-12 items-center justify-center gap-2 rounded-full bg-leaf-800 px-5 font-semibold text-white transition-colors hover:bg-leaf-900 disabled:cursor-wait disabled:opacity-70";
export const secondaryButton =
  "inline-flex h-12 items-center justify-center gap-2 rounded-full border-2 border-leaf-800 px-5 font-semibold text-leaf-900 transition-colors hover:bg-leaf-50 disabled:cursor-wait disabled:opacity-70";
