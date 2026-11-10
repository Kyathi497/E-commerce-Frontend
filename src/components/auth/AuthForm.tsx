"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { GoogleIcon } from "@/components/icons";
import { api } from "@/lib/api";
import { type Account, firstName, useAuth } from "./AuthProvider";

type Mode = "login" | "register";
type Field = "name" | "email" | "password";

const COPY = {
  login: {
    title: "Welcome back",
    lede: "Log in and checkout fills in your name, mobile number and delivery address for you.",
    submit: "Log in",
    working: "Logging in…",
    switchText: "New to Tej Organics?",
    switchLink: "Create an account",
  },
  register: {
    title: "Create your account",
    lede: "Save your delivery details once and checkout is quicker every time you reorder.",
    submit: "Create account",
    working: "Creating your account…",
    switchText: "Already have an account?",
    switchLink: "Log in",
  },
} as const;

function safeNext(next: string | null) {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : "/";
}

const withNext = (path: string, next: string) => (next === "/" ? path : `${path}?next=${encodeURIComponent(next)}`);

// Reads ?next, ?google=test and ?error from the URL. Rendered inside Suspense;
// the fallback is the same form without them, so nothing shifts on load.
export function AuthFormFromURL({ mode }: { mode: Mode }) {
  const params = useSearchParams();
  return (
    <AuthForm
      mode={mode}
      next={safeNext(params.get("next"))}
      googleTest={params.get("google") === "test"}
      googleError={params.get("error") === "google"}
    />
  );
}

export function AuthForm({
  mode,
  next = "/",
  googleTest = false,
  googleError = false,
}: {
  mode: Mode;
  next?: string;
  googleTest?: boolean;
  googleError?: boolean;
}) {
  const copy = COPY[mode];
  const router = useRouter();
  const { user, ready, signedIn, logout } = useAuth();
  const [values, setValues] = useState<Record<Field, string>>({ name: "", email: "", password: "" });
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [message, setMessage] = useState<string | null>(googleError ? "Google sign-in didn't finish. Please try again, or use your email and password." : null);
  const [emailTaken, setEmailTaken] = useState(false);
  const [working, setWorking] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  function done(account: Account) {
    signedIn(account);
    router.replace(next);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setWorking(true);
    setMessage(null);
    setErrors({});
    setEmailTaken(false);
    const res = await api<{ user: Account }>(`/auth/${mode}`, {
      method: "POST",
      body: mode === "login" ? { email: values.email, password: values.password } : values,
    });
    if (res.ok) return done(res.data.user);
    const { fields, code, error } = res.error;
    setErrors((fields ?? {}) as Partial<Record<Field, string>>);
    setEmailTaken(code === "EMAIL_TAKEN");
    if (!fields) setMessage(error);
    const first = fields && (Object.keys(fields)[0] as Field | undefined);
    if (first) document.getElementById(`a-${first}`)?.focus();
    setWorking(false);
  }

  if (ready && user) {
    return (
      <div>
        <h1 className="font-display text-4xl font-extrabold tracking-[-0.03em] text-leaf-900 sm:text-[44px]">
          Hi, {firstName(user.name)}
        </h1>
        <p className="mt-3 text-[17px] text-ink-soft">
          You&apos;re logged in as <span className="font-semibold text-ink">{user.email}</span>.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href={next === "/" ? "/shop" : next}
            className="flex h-14 items-center rounded-full bg-turmeric-500 px-7 text-[17px] font-bold text-leaf-950 transition-colors hover:bg-turmeric-600"
          >
            {next === "/checkout" ? "Continue to checkout" : "Continue shopping"}
          </Link>
          <button
            type="button"
            onClick={logout}
            className="h-14 rounded-full px-6 text-[17px] font-semibold text-leaf-900 transition-colors hover:bg-leaf-50"
          >
            Log out
          </button>
        </div>
      </div>
    );
  }

  const input = (id: Field) =>
    `mt-1.5 block h-12 w-full rounded-xl border bg-white px-4 text-[16px] text-ink placeholder:text-ink-mute focus:border-leaf-700 focus:outline-none focus:ring-2 focus:ring-leaf-200 ${
      errors[id] ? "border-chilli-700" : "border-line"
    }`;

  const set = (id: Field) => (e: React.ChangeEvent<HTMLInputElement>) => setValues((v) => ({ ...v, [id]: e.target.value }));

  const describe = (id: Field, hint?: string) => [errors[id] && `ae-${id}`, hint].filter(Boolean).join(" ") || undefined;

  return (
    <div>
      <h1 className="font-display text-4xl font-extrabold tracking-[-0.03em] text-leaf-900 sm:text-[44px]">{copy.title}</h1>
      <p className="mt-3 max-w-[44ch] text-[17px] leading-relaxed text-ink-soft">{copy.lede}</p>

      {googleTest ? (
        <GoogleTestPanel next={next} onDone={done} />
      ) : (
        <a
          href={withNext("/api/auth/google", next)}
          className="mt-8 flex h-12 w-full items-center justify-center gap-3 rounded-full border border-line bg-white text-[16px] font-semibold text-ink transition-colors hover:border-leaf-200 hover:bg-leaf-50"
        >
          <GoogleIcon className="size-5" />
          Continue with Google
        </a>
      )}

      <div className="my-7 flex items-center gap-4 text-sm font-medium text-ink-mute" aria-hidden>
        <span className="h-px flex-1 bg-line" />
        or with your email
        <span className="h-px flex-1 bg-line" />
      </div>

      <form onSubmit={onSubmit} noValidate aria-describedby={message ? "auth-msg" : undefined}>
        <fieldset disabled={working} className="space-y-5">
          <legend className="sr-only">{mode === "login" ? "Log in with email" : "Sign up with email"}</legend>
          {mode === "register" && (
            <div>
              <label htmlFor="a-name" className="text-[15px] font-semibold text-ink">
                Your name
              </label>
              <input
                id="a-name"
                autoComplete="name"
                value={values.name}
                onChange={set("name")}
                aria-invalid={!!errors.name}
                aria-describedby={describe("name")}
                className={input("name")}
              />
              {errors.name && (
                <p id="ae-name" className="mt-1.5 text-sm font-medium text-chilli-700">
                  {errors.name}
                </p>
              )}
            </div>
          )}

          <div>
            <label htmlFor="a-email" className="text-[15px] font-semibold text-ink">
              Email
            </label>
            <input
              id="a-email"
              type="email"
              inputMode="email"
              autoComplete={mode === "login" ? "username" : "email"}
              spellCheck={false}
              value={values.email}
              onChange={set("email")}
              aria-invalid={!!errors.email}
              aria-describedby={describe("email")}
              className={input("email")}
            />
            {errors.email && (
              <p id="ae-email" className="mt-1.5 text-sm font-medium text-chilli-700">
                {errors.email}{" "}
                {emailTaken && (
                  <Link href={withNext("/login", next)} className="underline">
                    Go to log in
                  </Link>
                )}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="a-password" className="text-[15px] font-semibold text-ink">
              Password
            </label>
            <div className="relative">
              <input
                id="a-password"
                type={showPassword ? "text" : "password"}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                value={values.password}
                onChange={set("password")}
                aria-invalid={!!errors.password}
                aria-describedby={describe("password", mode === "register" ? "ah-password" : undefined)}
                className={`${input("password")} pr-14`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                className="absolute right-1 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-lg text-ink-mute transition-colors hover:bg-leaf-50 hover:text-leaf-900"
              >
                {showPassword ? <EyeOff className="size-5" aria-hidden /> : <Eye className="size-5" aria-hidden />}
              </button>
            </div>
            {errors.password ? (
              <p id="ae-password" className="mt-1.5 text-sm font-medium text-chilli-700">
                {errors.password}
              </p>
            ) : (
              mode === "register" && (
                <p id="ah-password" className="mt-1.5 text-sm text-ink-mute">
                  At least 8 characters.
                </p>
              )
            )}
            {mode === "login" && (
              <p className="mt-2 text-[15px]">
                <Link href="/forgot-password" className="font-semibold text-leaf-800 underline">
                  Forgot your password?
                </Link>
              </p>
            )}
          </div>
        </fieldset>

        {message && (
          <p id="auth-msg" role="alert" className="mt-6 rounded-xl bg-chilli-100 px-4 py-3 text-[15px] font-medium text-chilli-700">
            {message}
          </p>
        )}

        <button
          type="submit"
          disabled={working}
          className="mt-8 flex h-14 w-full items-center justify-center gap-2 rounded-full bg-turmeric-500 text-[17px] font-bold text-leaf-950 transition-colors hover:bg-turmeric-600 disabled:cursor-wait disabled:opacity-70"
        >
          {working ? (
            <>
              <Loader2 className="size-5 animate-spin" aria-hidden /> {copy.working}
            </>
          ) : (
            copy.submit
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-[15px] text-ink-soft">
        {copy.switchText}{" "}
        <Link href={withNext(mode === "login" ? "/register" : "/login", next)} className="font-semibold text-leaf-800 underline">
          {copy.switchLink}
        </Link>
      </p>
    </div>
  );
}

// Test mode stand-in for Google, styled like the checkout's test-payment panel.
function GoogleTestPanel({ next, onDone }: { next: string; onDone: (a: Account) => void }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  async function simulate(e: React.FormEvent) {
    e.preventDefault();
    setWorking(true);
    setError(null);
    const res = await api<{ user: Account }>("/auth/google/test", { method: "POST", body: { email } });
    if (res.ok) return onDone(res.data.user);
    setError(res.error.fields?.email ?? res.error.error);
    setWorking(false);
  }

  return (
    <form onSubmit={simulate} noValidate className="mt-8 rounded-[20px] border-2 border-dashed border-turmeric-600 bg-turmeric-100 p-5">
      <p className="font-display text-lg font-bold text-leaf-950">Test mode: Google sign-in isn&apos;t connected yet</p>
      <p className="mt-1 text-[15px] text-ink-soft">
        Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to go live. To try the flow now, enter the Google email you would
        sign in with.
      </p>
      <label htmlFor="g-email" className="mt-4 block text-[15px] font-semibold text-ink">
        Google email
      </label>
      <input
        id="g-email"
        type="email"
        inputMode="email"
        autoComplete="email"
        spellCheck={false}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        aria-invalid={!!error}
        aria-describedby={error ? "g-error" : undefined}
        className={`mt-1.5 block h-12 w-full rounded-xl border bg-white px-4 text-[16px] text-ink focus:border-leaf-700 focus:outline-none focus:ring-2 focus:ring-leaf-200 ${
          error ? "border-chilli-700" : "border-turmeric-600/40"
        }`}
      />
      {error && (
        <p id="g-error" role="alert" className="mt-1.5 text-sm font-medium text-chilli-700">
          {error}
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={working}
          className="flex h-12 items-center gap-2 rounded-full bg-leaf-800 px-5 font-semibold text-white transition-colors hover:bg-leaf-900 disabled:cursor-wait disabled:opacity-70"
        >
          {working ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <GoogleIcon className="size-5 rounded-full bg-white p-0.5" />}
          Simulate Google sign-in
        </button>
        <button
          type="button"
          onClick={() => router.replace(withNext(window.location.pathname, next))}
          className="h-12 rounded-full px-5 font-semibold text-leaf-900 transition-colors hover:bg-white"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
