"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { type Account, useAuth } from "./AuthProvider";

// Forgot / reset password and email confirmation, styled like AuthForm.

const inputClass = (invalid: boolean) =>
  `mt-1.5 block h-12 w-full rounded-xl border bg-white px-4 text-[16px] text-ink placeholder:text-ink-mute focus:border-leaf-700 focus:outline-none focus:ring-2 focus:ring-leaf-200 ${
    invalid ? "border-chilli-700" : "border-line"
  }`;

const primaryButton =
  "mt-8 flex h-14 w-full items-center justify-center gap-2 rounded-full bg-turmeric-500 text-[17px] font-bold text-leaf-950 transition-colors hover:bg-turmeric-600 disabled:cursor-wait disabled:opacity-70";

const linkButton =
  "flex h-14 items-center rounded-full bg-turmeric-500 px-7 text-[17px] font-bold text-leaf-950 transition-colors hover:bg-turmeric-600";

function Heading({ title, lede }: { title: string; lede: React.ReactNode }) {
  return (
    <>
      <h1 className="font-display text-4xl font-extrabold tracking-[-0.03em] text-leaf-900 sm:text-[44px]">{title}</h1>
      <p className="mt-3 max-w-[44ch] text-[17px] leading-relaxed text-ink-soft">{lede}</p>
    </>
  );
}

function Alert({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <p id={id} role="alert" className="mt-6 rounded-xl bg-chilli-100 px-4 py-3 text-[15px] font-medium text-chilli-700">
      {children}
    </p>
  );
}

// Email links carry the token in the URL fragment (#token=…), which never
// reaches a server log. Read it once, then drop it from the address bar.
let hashToken: string | null = null;

function readHashToken() {
  const value = new URLSearchParams(window.location.hash.slice(1)).get("token");
  if (value) {
    hashToken = value;
    history.replaceState(null, "", window.location.pathname);
  }
  return hashToken;
}

const noSubscription = () => () => {};

// undefined while server-rendering, then the token (or null if the link had none).
function useHashToken(): string | null | undefined {
  return useSyncExternalStore(noSubscription, readHashToken, () => undefined);
}

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setWorking(true);
    setError(null);
    setMessage(null);
    const res = await api("/auth/password/forgot", { method: "POST", body: { email } });
    setWorking(false);
    if (res.ok) return setSentTo(email.trim());
    if (res.error.fields?.email) {
      setError(res.error.fields.email);
      document.getElementById("f-email")?.focus();
    } else setMessage(res.error.error);
  }

  if (sentTo) {
    return (
      <div>
        <Heading
          title="Check your email"
          lede={
            <>
              If <span className="font-semibold text-ink">{sentTo}</span> has an account, we&apos;ve sent a link to choose a
              new password. It works for 30 minutes.
            </>
          }
        />
        <p className="mt-4 text-[15px] text-ink-soft">
          Nothing arrived? Check spam, or{" "}
          <button type="button" onClick={() => setSentTo(null)} className="font-semibold text-leaf-800 underline">
            try another email
          </button>
          .
        </p>
      </div>
    );
  }

  return (
    <div>
      <Heading title="Forgot your password?" lede="Enter the email you signed up with and we'll send you a link to choose a new one." />
      <form onSubmit={onSubmit} noValidate className="mt-8" aria-describedby={message ? "fp-msg" : undefined}>
        <label htmlFor="f-email" className="text-[15px] font-semibold text-ink">
          Email
        </label>
        <input
          id="f-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          spellCheck={false}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={!!error}
          aria-describedby={error ? "fe-email" : undefined}
          className={inputClass(!!error)}
        />
        {error && (
          <p id="fe-email" className="mt-1.5 text-sm font-medium text-chilli-700">
            {error}
          </p>
        )}
        {message && <Alert id="fp-msg">{message}</Alert>}
        <button type="submit" disabled={working} className={primaryButton}>
          {working ? (
            <>
              <Loader2 className="size-5 animate-spin" aria-hidden /> Sending…
            </>
          ) : (
            "Send reset link"
          )}
        </button>
      </form>
      <p className="mt-6 text-center text-[15px] text-ink-soft">
        Remembered it?{" "}
        <Link href="/login" className="font-semibold text-leaf-800 underline">
          Log in
        </Link>
      </p>
    </div>
  );
}

export function ResetPasswordForm() {
  const token = useHashToken();
  const router = useRouter();
  const { signedIn } = useAuth();
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setWorking(true);
    setError(null);
    setMessage(null);
    const res = await api<{ user: Account }>("/auth/password/reset", { method: "POST", body: { token, password } });
    if (res.ok) {
      signedIn(res.data.user);
      return router.replace("/");
    }
    setWorking(false);
    if (res.error.fields?.password) {
      setError(res.error.fields.password);
      document.getElementById("r-password")?.focus();
    } else setMessage(res.error.error);
  }

  if (token === undefined) return <Heading title="Choose a new password" lede="One moment…" />;

  if (!token) {
    return (
      <div>
        <Heading title="This link isn't complete" lede="Open the link from the email again, or ask for a new one." />
        <div className="mt-8">
          <Link href="/forgot-password" className={`${linkButton} inline-flex`}>
            Get a new link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Heading title="Choose a new password" lede="You'll be logged in on this device. Other devices are logged out." />
      <form onSubmit={onSubmit} noValidate className="mt-8" aria-describedby={message ? "rp-msg" : undefined}>
        {/* Lets password managers save the new password against the right account. */}
        <input type="text" name="username" autoComplete="username" className="hidden" tabIndex={-1} aria-hidden readOnly />
        <label htmlFor="r-password" className="text-[15px] font-semibold text-ink">
          New password
        </label>
        <div className="relative">
          <input
            id="r-password"
            type={show ? "text" : "password"}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={!!error}
            aria-describedby={error ? "re-password" : "rh-password"}
            className={`${inputClass(!!error)} pr-14`}
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? "Hide password" : "Show password"}
            aria-pressed={show}
            className="absolute right-1 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-lg text-ink-mute transition-colors hover:bg-leaf-50 hover:text-leaf-900"
          >
            {show ? <EyeOff className="size-5" aria-hidden /> : <Eye className="size-5" aria-hidden />}
          </button>
        </div>
        {error ? (
          <p id="re-password" className="mt-1.5 text-sm font-medium text-chilli-700">
            {error}
          </p>
        ) : (
          <p id="rh-password" className="mt-1.5 text-sm text-ink-mute">
            At least 8 characters.
          </p>
        )}
        {message && (
          <Alert id="rp-msg">
            {message}{" "}
            <Link href="/forgot-password" className="underline">
              Get a new link
            </Link>
          </Alert>
        )}
        <button type="submit" disabled={working} className={primaryButton}>
          {working ? (
            <>
              <Loader2 className="size-5 animate-spin" aria-hidden /> Saving…
            </>
          ) : (
            "Save password and log in"
          )}
        </button>
      </form>
    </div>
  );
}

export function VerifyEmail() {
  const token = useHashToken();
  const [result, setResult] = useState<{ ok: boolean; message?: string } | null>(null);
  // Tokens are single-use: send each one once, even when effects run twice.
  const sent = useRef<string | null>(null);

  useEffect(() => {
    if (!token || sent.current === token) return;
    sent.current = token;
    api("/auth/email/verify", { method: "POST", body: { token } }).then((res) =>
      setResult(res.ok ? { ok: true } : { ok: false, message: res.error.error }),
    );
  }, [token]);

  if (token === null) {
    return <Heading title="This link isn't complete" lede="Open the link from the email again. You can ask for a new one from the account menu." />;
  }
  if (!result) {
    return (
      <div>
        <Heading title="Confirming your email" lede="One moment…" />
        <Loader2 className="mt-6 size-6 animate-spin text-leaf-800" aria-label="Confirming" />
      </div>
    );
  }
  if (!result.ok) {
    return (
      <div>
        <Heading title="We couldn't confirm your email" lede={result.message} />
        <div className="mt-8">
          <Link href="/login" className={`${linkButton} inline-flex`}>
            Log in
          </Link>
        </div>
      </div>
    );
  }
  return (
    <div>
      <Heading title="Email confirmed" lede="Thank you. Order updates and invoices will come to this address." />
      <div className="mt-8">
        <Link href="/shop" className={`${linkButton} inline-flex`}>
          Continue shopping
        </Link>
      </div>
    </div>
  );
}
