"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BadgeCheck, Download, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { type Account, useAuth } from "@/components/auth/AuthProvider";
import {
  FieldError,
  inputClass,
  Notice,
  primaryButton,
  secondaryButton,
  SectionTitle,
} from "@/components/account/AccountShell";

type Errors = Record<string, string>;
type Outcome = { kind: "ok" | "error"; text: string } | null;

export default function ProfilePage() {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <div className="space-y-14">
      <ProfileForm user={user} />
      <PasswordForm user={user} />
      <YourData user={user} />
    </div>
  );
}

function ProfileForm({ user }: { user: Account }) {
  const { setUser } = useAuth();
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone ?? "");
  const [optIn, setOptIn] = useState(user.marketingOptIn);
  const [errors, setErrors] = useState<Errors>({});
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setOutcome(null);
    const res = await api<{ user: Account }>("/me", { method: "PATCH", body: { name, phone, marketingOptIn: optIn } });
    setBusy(false);
    if (!res.ok) {
      setErrors(res.error.fields ?? {});
      setOutcome({ kind: "error", text: res.error.error });
      return;
    }
    setUser(res.data.user);
    setPhone(res.data.user.phone ?? "");
    setOutcome({ kind: "ok", text: "Saved." });
  }

  return (
    <section aria-labelledby="profile-title">
      <SectionTitle>
        <span id="profile-title">Profile</span>
      </SectionTitle>
      <form onSubmit={onSubmit} noValidate className="mt-5 max-w-xl space-y-5">
        <div>
          <label htmlFor="p-email" className="text-[15px] font-semibold text-ink">
            Email
          </label>
          <input id="p-email" value={user.email} disabled className={inputClass()} aria-describedby="p-email-note" />
          <p id="p-email-note" className="mt-1.5 flex items-center gap-1.5 text-sm text-ink-mute">
            {user.emailVerified ? (
              <>
                <BadgeCheck className="size-4 text-leaf-700" aria-hidden /> Confirmed. Order updates go here.
              </>
            ) : (
              "Not confirmed yet. Use the link we emailed you (or resend it from the account menu)."
            )}
          </p>
        </div>
        <div>
          <label htmlFor="p-name" className="text-[15px] font-semibold text-ink">
            Full name
          </label>
          <input
            id="p-name"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? "p-name-e" : undefined}
            className={inputClass(!!errors.name)}
          />
          <FieldError id="p-name-e" message={errors.name} />
        </div>
        <div>
          <label htmlFor="p-phone" className="text-[15px] font-semibold text-ink">
            Mobile number <span className="font-normal text-ink-mute">(optional)</span>
          </label>
          <input
            id="p-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            aria-invalid={!!errors.phone}
            aria-describedby={errors.phone ? "p-phone-e" : undefined}
            className={inputClass(!!errors.phone)}
          />
          <FieldError id="p-phone-e" message={errors.phone} />
        </div>
        <label className="flex cursor-pointer items-start gap-3 text-[15px] text-ink-soft">
          <input type="checkbox" checked={optIn} onChange={(e) => setOptIn(e.target.checked)} className="mt-1 size-4 accent-leaf-800" />
          <span>Email me about new harvests and offers.</span>
        </label>
        {outcome && <Notice kind={outcome.kind}>{outcome.text}</Notice>}
        <button type="submit" disabled={busy} className={primaryButton}>
          {busy && <Loader2 className="size-4 animate-spin" aria-hidden />} Save changes
        </button>
      </form>
    </section>
  );
}

function PasswordForm({ user }: { user: Account }) {
  const { setUser } = useAuth();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setOutcome(null);
    const res = await api<{ user: Account }>("/me/password", {
      method: "POST",
      body: { ...(user.hasPassword && { currentPassword: current }), newPassword: next },
    });
    setBusy(false);
    if (!res.ok) {
      setErrors(res.error.fields ?? {});
      setOutcome({ kind: "error", text: res.error.error });
      return;
    }
    setUser(res.data.user);
    setCurrent("");
    setNext("");
    setOutcome({ kind: "ok", text: "Password changed. You've been logged out on every other device." });
  }

  return (
    <section aria-labelledby="password-title">
      <SectionTitle>
        <span id="password-title">{user.hasPassword ? "Change password" : "Set a password"}</span>
      </SectionTitle>
      {!user.hasPassword && (
        <p className="mt-2 max-w-xl text-[15px] text-ink-soft">
          You sign in with Google. Set a password if you&apos;d also like to log in with your email.
        </p>
      )}
      <form onSubmit={onSubmit} noValidate className="mt-5 max-w-xl space-y-5">
        {/* lets password managers tie the new password to this account */}
        <input type="email" autoComplete="username" value={user.email} readOnly hidden />
        {user.hasPassword && (
          <div>
            <label htmlFor="pw-current" className="text-[15px] font-semibold text-ink">
              Current password
            </label>
            <input
              id="pw-current"
              type="password"
              autoComplete="current-password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              aria-invalid={!!errors.currentPassword}
              aria-describedby={errors.currentPassword ? "pw-current-e" : undefined}
              className={inputClass(!!errors.currentPassword)}
            />
            <FieldError id="pw-current-e" message={errors.currentPassword} />
          </div>
        )}
        <div>
          <label htmlFor="pw-new" className="text-[15px] font-semibold text-ink">
            New password
          </label>
          <input
            id="pw-new"
            type="password"
            autoComplete="new-password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            aria-invalid={!!errors.newPassword}
            aria-describedby={errors.newPassword ? "pw-new-e" : "pw-new-hint"}
            className={inputClass(!!errors.newPassword)}
          />
          {errors.newPassword ? (
            <FieldError id="pw-new-e" message={errors.newPassword} />
          ) : (
            <p id="pw-new-hint" className="mt-1.5 text-sm text-ink-mute">
              At least 8 characters.
            </p>
          )}
        </div>
        {outcome && <Notice kind={outcome.kind}>{outcome.text}</Notice>}
        <button type="submit" disabled={busy} className={primaryButton}>
          {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {user.hasPassword ? "Change password" : "Set password"}
        </button>
      </form>
    </section>
  );
}

function YourData({ user }: { user: Account }) {
  const { signedOut } = useAuth();
  const router = useRouter();
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // The export is fetched (so an expired session renews) and saved as a file.
  async function download() {
    setExporting(true);
    setExportError(null);
    const res = await api<unknown>("/me/export");
    setExporting(false);
    if (!res.ok) return setExportError(res.error.error);
    const url = URL.createObjectURL(new Blob([JSON.stringify(res.data, null, 2)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "tej-organics-my-data.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function onDelete(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setDeleteError(null);
    const res = await api("/me", { method: "DELETE", body: user.hasPassword ? { password } : {} });
    setBusy(false);
    if (!res.ok) {
      setErrors(res.error.fields ?? {});
      setDeleteError(res.error.error);
      return;
    }
    signedOut();
    router.replace("/");
  }

  return (
    <section aria-labelledby="data-title">
      <SectionTitle>
        <span id="data-title">Your data</span>
      </SectionTitle>
      <p className="mt-2 max-w-xl text-[15px] text-ink-soft">
        Download everything we hold about your account, or delete it. Past orders are kept for tax records but no longer
        linked to you.
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        <button type="button" onClick={() => void download()} disabled={exporting} className={secondaryButton}>
          {exporting ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Download className="size-4" aria-hidden />}
          Download my data
        </button>
        {!deleting && user.role !== "admin" && (
          <button
            type="button"
            onClick={() => setDeleting(true)}
            className="inline-flex h-12 items-center rounded-full px-5 font-semibold text-chilli-700 hover:bg-chilli-100"
          >
            Delete my account
          </button>
        )}
      </div>
      {exportError && (
        <div className="mt-4 max-w-xl">
          <Notice kind="error">{exportError}</Notice>
        </div>
      )}

      {deleting && (
        <form onSubmit={onDelete} noValidate className="mt-6 max-w-xl space-y-5 rounded-[20px] border-2 border-chilli-100 p-5">
          <p className="font-display text-lg font-bold text-chilli-700">Delete your account?</p>
          <p className="text-[15px] text-ink-soft">
            Your saved addresses go, you&apos;re logged out everywhere, and this can&apos;t be undone. Orders still on their
            way will be delivered.
          </p>
          {user.hasPassword && (
            <div>
              <label htmlFor="del-pw" className="text-[15px] font-semibold text-ink">
                Your password
              </label>
              <input
                id="del-pw"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? "del-pw-e" : undefined}
                className={inputClass(!!errors.password)}
              />
              <FieldError id="del-pw-e" message={errors.password} />
            </div>
          )}
          <div>
            <label htmlFor="del-confirm" className="text-[15px] font-semibold text-ink">
              Type DELETE to confirm
            </label>
            <input id="del-confirm" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} className={inputClass()} />
          </div>
          {deleteError && <Notice kind="error">{deleteError}</Notice>}
          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={busy || confirmText.trim().toUpperCase() !== "DELETE"}
              className="inline-flex h-12 items-center gap-2 rounded-full bg-chilli-700 px-5 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy && <Loader2 className="size-4 animate-spin" aria-hidden />} Delete my account
            </button>
            <button type="button" onClick={() => setDeleting(false)} className="h-12 rounded-full px-5 font-semibold text-leaf-900 hover:bg-leaf-50">
              Keep my account
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
