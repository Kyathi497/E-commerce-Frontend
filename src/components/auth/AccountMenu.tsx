"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, LayoutDashboard, LogOut, MapPin, Package, UserRound } from "lucide-react";
import { api } from "@/lib/api";
import { firstName, useAuth } from "./AuthProvider";

// Shown until the account's email is confirmed: order updates go there.
function VerifyEmailNudge() {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [note, setNote] = useState<string | null>(null);

  async function resend() {
    setState("sending");
    const res = await api<{ alreadyVerified: boolean }>("/auth/email/resend", { method: "POST" });
    if (res.ok) {
      setState("sent");
      setNote(res.data.alreadyVerified ? "Your email is already confirmed." : "Sent. Check your inbox.");
    } else {
      setState("error");
      setNote(res.error.error);
    }
  }

  return (
    <div className="mt-2 rounded-xl bg-turmeric-100 px-3 py-2 text-[13px] leading-snug text-ink-soft">
      <p>Confirm your email so we can send order updates there.</p>
      {note ? (
        <p role="status" className={`mt-1 font-semibold ${state === "error" ? "text-chilli-700" : "text-leaf-900"}`}>
          {note}
        </p>
      ) : (
        <button
          type="button"
          onClick={resend}
          disabled={state === "sending"}
          className="mt-1 font-semibold text-leaf-800 underline disabled:cursor-wait disabled:opacity-70"
        >
          {state === "sending" ? "Sending…" : "Send the link again"}
        </button>
      )}
    </div>
  );
}

// Sends people back to the page they were on after logging in.
export function loginHref(pathname: string) {
  return pathname === "/" || pathname === "/login" || pathname === "/register"
    ? "/login"
    : `/login?next=${encodeURIComponent(pathname)}`;
}

export function AccountMenu() {
  const { user, address, ready, logout } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Close when navigating away.
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
  }

  // Hold the space until the session is known, so the header doesn't jump.
  if (!ready) return <span className="block size-11 sm:w-[104px]" aria-hidden />;

  if (!user) {
    return (
      <Link
        href={loginHref(pathname)}
        className="flex h-11 items-center gap-2 rounded-full px-3 text-[15px] font-semibold text-leaf-900 transition-colors hover:bg-leaf-50 sm:border sm:border-line sm:pl-3.5 sm:pr-4"
      >
        <UserRound className="size-5" strokeWidth={2} aria-hidden />
        <span className="sr-only sm:not-sr-only">Log in</span>
      </Link>
    );
  }

  return (
    <div ref={root} className="relative">
      <button
        ref={trigger}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="account-menu"
        aria-label={`Account: ${user.name}`}
        className="flex h-11 items-center gap-2 rounded-full pl-1 pr-1 text-[15px] font-semibold text-leaf-900 transition-colors hover:bg-leaf-50 sm:border sm:border-line sm:pr-3"
      >
        <span className="grid size-9 place-items-center rounded-full bg-leaf-100 font-display text-[16px] font-bold text-leaf-900" aria-hidden>
          {user.name.trim().charAt(0).toUpperCase()}
        </span>
        <span className="hidden max-w-[10ch] truncate sm:inline">{firstName(user.name)}</span>
        <ChevronDown className={`hidden size-4 transition-transform sm:block ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>

      {open && (
        <div
          id="account-menu"
          className="absolute right-0 top-[calc(100%+8px)] z-40 w-72 rounded-2xl border border-line bg-white p-2 shadow-[0_18px_40px_rgba(15,44,26,0.16)]"
        >
          <div className="px-3 pb-3 pt-2">
            <p className="truncate font-display text-lg font-bold text-leaf-900">{user.name}</p>
            <p className="truncate text-sm text-ink-mute">{user.email}</p>
            <p className="mt-3 rounded-xl bg-leaf-50 px-3 py-2 text-[13px] leading-snug text-ink-soft">
              {address
                ? `Checkout fills in delivery to ${address.city} ${address.pincode}.`
                : "Your delivery details are saved the first time you check out."}
            </p>
            {!user.emailVerified && <VerifyEmailNudge />}
          </div>
          <ul className="border-t border-line pt-2">
            {[
              { href: "/account/orders", label: "Your orders", Icon: Package },
              { href: "/account/addresses", label: "Saved addresses", Icon: MapPin },
              { href: "/account", label: "Profile", Icon: UserRound },
              ...(user.role === "admin" ? [{ href: "/admin", label: "Admin", Icon: LayoutDashboard }] : []),
            ].map(({ href, label, Icon }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="flex h-11 items-center gap-2.5 rounded-xl px-3 text-[15px] font-semibold text-leaf-900 transition-colors hover:bg-leaf-50"
                >
                  <Icon className="size-[18px]" aria-hidden />
                  {label}
                </Link>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              void logout();
            }}
            className="flex h-11 w-full items-center gap-2.5 rounded-xl px-3 text-left text-[15px] font-semibold text-leaf-900 transition-colors hover:bg-leaf-50"
          >
            <LogOut className="size-[18px]" aria-hidden />
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
