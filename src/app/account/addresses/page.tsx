"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { api } from "@/lib/api";
import { matchState, STATES } from "@/lib/states";
import { type SavedAddress, useAuth } from "@/components/auth/AuthProvider";
import {
  FieldError,
  inputClass,
  Notice,
  primaryButton,
  secondaryButton,
  SectionTitle,
} from "@/components/account/AccountShell";

type Draft = Omit<SavedAddress, "id" | "isDefault" | "line2" | "landmark"> & { line2: string; landmark: string; isDefault: boolean };

const FIELDS: { id: keyof Draft; label: string; auto?: string; type?: string; inputMode?: "tel" | "numeric"; span?: boolean; optional?: boolean }[] = [
  { id: "label", label: "Label", span: true },
  { id: "name", label: "Full name", auto: "name" },
  { id: "phone", label: "Mobile number", auto: "tel-national", type: "tel", inputMode: "tel" },
  { id: "line1", label: "House no., street, area", auto: "address-line1", span: true },
  { id: "line2", label: "Apartment, floor", auto: "address-line2", optional: true },
  { id: "landmark", label: "Landmark", optional: true },
  { id: "city", label: "City / town", auto: "address-level2" },
  { id: "pincode", label: "PIN code", auto: "postal-code", inputMode: "numeric" },
  { id: "state", label: "State", auto: "address-level1", span: true },
];

const toDraft = (a?: SavedAddress): Draft => ({
  label: a?.label ?? "Home",
  name: a?.name ?? "",
  phone: a?.phone ?? "",
  line1: a?.line1 ?? "",
  line2: a?.line2 ?? "",
  landmark: a?.landmark ?? "",
  city: a?.city ?? "",
  state: matchState(a?.state) || "Andhra Pradesh",
  pincode: a?.pincode ?? "",
  isDefault: a?.isDefault ?? false,
});

export default function AddressesPage() {
  const { setAddress } = useAuth();
  const [items, setItems] = useState<SavedAddress[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  // "new", an address id being edited, or nothing open.
  const [editing, setEditing] = useState<string | null>(null);

  // Bumped after every change to fetch the book again.
  const [version, setVersion] = useState(0);
  const load = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    let live = true;
    void api<{ items: SavedAddress[] }>("/me/addresses").then((res) => {
      if (!live) return;
      if (!res.ok) return setLoadError(res.error.error);
      setItems(res.data.items);
      // Checkout fills in the default; keep it current.
      setAddress(res.data.items.find((a) => a.isDefault) ?? null);
    });
    return () => {
      live = false;
    };
  }, [version, setAddress]);

  const saved = () => {
    setEditing(null);
    load();
  };

  return (
    <section aria-labelledby="addr-title">
      <SectionTitle
        action={
          editing !== "new" &&
          items &&
          items.length < 20 && (
            <button type="button" onClick={() => setEditing("new")} className={secondaryButton}>
              <Plus className="size-4" aria-hidden /> Add an address
            </button>
          )
        }
      >
        <span id="addr-title">Saved addresses</span>
      </SectionTitle>
      <p className="mt-2 text-[15px] text-ink-soft">Checkout fills in your default address. You can pick another there.</p>

      {loadError && (
        <div className="mt-6">
          <Notice kind="error">{loadError}</Notice>
        </div>
      )}

      {editing === "new" && (
        <div className="mt-6">
          <AddressForm onDone={saved} onCancel={() => setEditing(null)} />
        </div>
      )}

      {!items && !loadError ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2" aria-label="Loading addresses">
          <div className="h-44 animate-pulse rounded-[20px] bg-leaf-50" />
          <div className="h-44 animate-pulse rounded-[20px] bg-leaf-50" />
        </div>
      ) : items && items.length === 0 && editing !== "new" ? (
        <div className="mt-6 rounded-[20px] bg-leaf-50 p-6">
          <p className="font-semibold text-ink">No saved addresses yet.</p>
          <p className="mt-1 text-[15px] text-ink-soft">Add one now, or it&apos;s saved for you the first time you check out.</p>
        </div>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {items?.map((a) =>
            editing === a.id ? (
              <li key={a.id} className="sm:col-span-2">
                <AddressForm address={a} onDone={saved} onCancel={() => setEditing(null)} />
              </li>
            ) : (
              <AddressCard key={a.id} address={a} onEdit={() => setEditing(a.id)} onChanged={() => void load()} />
            ),
          )}
        </ul>
      )}
    </section>
  );
}

function AddressCard({ address: a, onEdit, onChanged }: { address: SavedAddress; onEdit: () => void; onChanged: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(call: () => Promise<{ ok: boolean; error?: { error: string } }>) {
    setBusy(true);
    setError(null);
    const res = await call();
    setBusy(false);
    if (!res.ok) return setError(res.error?.error ?? "Something went wrong.");
    onChanged();
  }

  const link = "font-semibold text-leaf-800 underline-offset-2 hover:underline disabled:opacity-60";

  return (
    <li className={`flex flex-col rounded-[20px] border-2 p-5 ${a.isDefault ? "border-leaf-700" : "border-line"}`}>
      <div className="flex items-center gap-2">
        <p className="font-display text-lg font-bold text-leaf-900">{a.label}</p>
        {a.isDefault && <span className="rounded-full bg-leaf-100 px-2 py-0.5 text-[12px] font-semibold text-leaf-900">Default</span>}
      </div>
      <p className="mt-2 font-semibold text-ink">{a.name}</p>
      <p className="tabular text-[15px] text-ink-soft">{a.phone}</p>
      <p className="mt-1 text-[15px] leading-snug text-ink-soft">
        {[a.line1, a.line2, a.landmark].filter(Boolean).join(", ")}
        <br />
        {a.city}, {a.state} {a.pincode}
      </p>
      {error && <p className="mt-3 text-sm font-medium text-chilli-700">{error}</p>}
      <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 pt-4 text-[15px]">
        {confirming ? (
          <>
            <span className="text-ink-soft">Remove this address?</span>
            <button
              type="button"
              disabled={busy}
              onClick={() => void run(() => api(`/me/addresses/${a.id}`, { method: "DELETE" }))}
              className="font-semibold text-chilli-700 hover:underline"
            >
              Remove
            </button>
            <button type="button" onClick={() => setConfirming(false)} className={link}>
              Keep
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={onEdit} className={link}>
              Edit
            </button>
            {!a.isDefault && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void run(() => api(`/me/addresses/${a.id}`, { method: "PATCH", body: { isDefault: true } }))}
                className={link}
              >
                Make default
              </button>
            )}
            <button type="button" onClick={() => setConfirming(true)} className={link}>
              Remove
            </button>
          </>
        )}
      </div>
    </li>
  );
}

function AddressForm({ address, onDone, onCancel }: { address?: SavedAddress; onDone: () => void; onCancel: () => void }) {
  const [draft, setDraft] = useState<Draft>(() => toDraft(address));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const prefix = address ? `a-${address.id}` : "a-new";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setMessage(null);
    const res = address
      ? await api(`/me/addresses/${address.id}`, { method: "PATCH", body: draft })
      : await api("/me/addresses", { method: "POST", body: draft });
    setBusy(false);
    if (!res.ok) {
      setErrors(res.error.fields ?? {});
      setMessage(res.error.error);
      const first = Object.keys(res.error.fields ?? {})[0];
      if (first) document.getElementById(`${prefix}-${first}`)?.focus();
      return;
    }
    onDone();
  }

  return (
    <form onSubmit={onSubmit} noValidate className="rounded-[20px] bg-leaf-50 p-5 sm:p-6">
      <p className="font-display text-lg font-bold text-leaf-900">{address ? "Edit address" : "New address"}</p>
      <div className="mt-4 grid gap-x-4 gap-y-5 sm:grid-cols-2">
        {FIELDS.map((f) => {
          const id = `${prefix}-${f.id}`;
          const err = errors[f.id];
          return (
            <div key={f.id} className={f.span ? "sm:col-span-2" : undefined}>
              <label htmlFor={id} className="text-[15px] font-semibold text-ink">
                {f.label}
                {f.optional && <span className="font-normal text-ink-mute"> (optional)</span>}
                {f.id === "label" && <span className="font-normal text-ink-mute"> (e.g. Home, Office, Amma&apos;s house)</span>}
              </label>
              {f.id === "state" ? (
                <select
                  id={id}
                  autoComplete={f.auto}
                  value={draft.state}
                  onChange={(e) => setDraft((d) => ({ ...d, state: e.target.value }))}
                  aria-invalid={!!err}
                  aria-describedby={err ? `${id}-e` : undefined}
                  className={inputClass(!!err)}
                >
                  {STATES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id={id}
                  type={f.type ?? "text"}
                  inputMode={f.inputMode}
                  autoComplete={f.auto}
                  value={draft[f.id] as string}
                  onChange={(e) => setDraft((d) => ({ ...d, [f.id]: e.target.value }))}
                  aria-invalid={!!err}
                  aria-describedby={err ? `${id}-e` : undefined}
                  className={inputClass(!!err)}
                />
              )}
              <FieldError id={`${id}-e`} message={err} />
            </div>
          );
        })}
      </div>
      {!address?.isDefault && (
        <label className="mt-5 flex cursor-pointer items-center gap-3 text-[15px] text-ink-soft">
          <input
            type="checkbox"
            checked={draft.isDefault}
            onChange={(e) => setDraft((d) => ({ ...d, isDefault: e.target.checked }))}
            className="size-4 accent-leaf-800"
          />
          Use this address at checkout by default
        </label>
      )}
      {message && (
        <div className="mt-5">
          <Notice kind="error">{message}</Notice>
        </div>
      )}
      <div className="mt-6 flex flex-wrap gap-3">
        <button type="submit" disabled={busy} className={primaryButton}>
          {busy && <Loader2 className="size-4 animate-spin" aria-hidden />} {address ? "Save address" : "Add address"}
        </button>
        <button type="button" onClick={onCancel} className="h-12 rounded-full px-5 font-semibold text-leaf-900 hover:bg-white">
          Cancel
        </button>
      </div>
    </form>
  );
}
