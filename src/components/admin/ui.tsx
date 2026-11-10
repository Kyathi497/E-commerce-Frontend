"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { api, type ApiError, type ApiResult } from "@/lib/api";

// Small building blocks shared by the /admin screens.

export function PageHeader({
  title,
  back,
  children,
}: {
  title: React.ReactNode;
  back?: { href: string; label: string };
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      {back && (
        <Link href={back.href} className="mb-2 inline-flex items-center gap-1.5 text-[15px] font-semibold text-leaf-800 hover:underline">
          <ArrowLeft className="size-4" aria-hidden /> {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold tracking-[-0.02em] text-leaf-900">{title}</h1>
        {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
      </div>
    </div>
  );
}

export function Card({ title, children, actions, className = "" }: { title?: React.ReactNode; children: React.ReactNode; actions?: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-line bg-white p-5 ${className}`}>
      {(title || actions) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          {title && <h2 className="font-display text-lg font-bold text-leaf-900">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

const buttonBase =
  "inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-[15px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60";

export const btn = {
  primary: `${buttonBase} bg-leaf-800 text-white hover:bg-leaf-900`,
  secondary: `${buttonBase} border border-line bg-white text-leaf-900 hover:bg-leaf-50`,
  danger: `${buttonBase} bg-chilli-700 text-white hover:bg-chilli-700/90`,
  ghost: `${buttonBase} text-leaf-900 hover:bg-leaf-50`,
};

export function Button({
  kind = "primary",
  busy,
  children,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { kind?: keyof typeof btn; busy?: boolean }) {
  return (
    <button type="button" {...props} disabled={busy || props.disabled} className={`${btn[kind]} ${className}`}>
      {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

export const control = (invalid?: boolean) =>
  `block h-10 w-full rounded-lg border bg-white px-3 text-[15px] text-ink placeholder:text-ink-mute focus:border-leaf-700 focus:outline-none focus:ring-2 focus:ring-leaf-200 disabled:bg-leaf-50 ${
    invalid ? "border-chilli-700" : "border-line"
  }`;

// Keeps input ids unique when one page has several forms with the same fields.
const FieldScopeContext = createContext("");

export function FieldScope({ id, children }: { id: string; children: React.ReactNode }) {
  return <FieldScopeContext.Provider value={id}>{children}</FieldScopeContext.Provider>;
}

// A labelled control with its error. `name` is the API's field name, so
// server errors land next to the right input.
export function Field({
  label,
  name,
  errors,
  hint,
  className = "",
  children,
}: {
  label: string;
  name: string;
  errors?: Record<string, string>;
  hint?: string;
  className?: string;
  children: (props: { id: string; "aria-invalid": boolean; "aria-describedby"?: string; className: string }) => React.ReactNode;
}) {
  const scope = useContext(FieldScopeContext);
  const id = `f-${scope ? `${scope}-` : ""}${name.replace(/\W/g, "-")}`;
  const error = errors?.[name];
  const describedBy = error ? `${id}-e` : hint ? `${id}-h` : undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-sm font-semibold text-ink">
        {label}
      </label>
      {children({ id, "aria-invalid": !!error, "aria-describedby": describedBy, className: control(!!error) })}
      {error ? (
        <p id={`${id}-e`} className="mt-1 text-sm font-medium text-chilli-700">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-h`} className="mt-1 text-[13px] text-ink-mute">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

export function Alert({ kind = "error", children }: { kind?: "error" | "ok" | "info"; children: React.ReactNode }) {
  const tone = { error: "bg-chilli-100 text-chilli-700", ok: "bg-leaf-100 text-leaf-900", info: "bg-turmeric-100 text-leaf-950" }[kind];
  return (
    <p role={kind === "error" ? "alert" : "status"} className={`rounded-lg px-4 py-3 text-[15px] font-medium ${tone}`}>
      {children}
    </p>
  );
}

export function Pill({ tone = "neutral", children }: { tone?: "neutral" | "good" | "warn" | "bad" | "dark"; children: React.ReactNode }) {
  const cls = {
    neutral: "bg-leaf-50 text-ink-soft",
    good: "bg-leaf-100 text-leaf-900",
    warn: "bg-turmeric-100 text-leaf-950",
    bad: "bg-chilli-100 text-chilli-700",
    dark: "bg-leaf-800 text-white",
  }[tone];
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[13px] font-semibold ${cls}`}>{children}</span>;
}

const STATUS_TONES: Record<string, "good" | "warn" | "bad" | "neutral"> = {
  active: "good",
  draft: "warn",
  paused: "warn",
  archived: "neutral",
  locked: "bad",
  deleted: "neutral",
};

export const statusTone = (s: string) => STATUS_TONES[s] ?? "neutral";

// A scrollable table with the house style.
export function Table({ head, children, empty }: { head: React.ReactNode[]; children: React.ReactNode; empty?: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-white">
      <table className="w-full min-w-[640px] text-left text-[15px]">
        <thead className="border-b border-line bg-leaf-50 text-[13px] uppercase tracking-[0.06em] text-ink-mute">
          <tr>
            {head.map((h, i) => (
              <th key={i} scope="col" className="px-4 py-3 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
      {empty && <div className="px-4 py-10 text-center text-ink-soft">{empty}</div>}
    </div>
  );
}

export const td = "px-4 py-3 align-top";

export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 py-10 text-ink-soft" role="status">
      <Loader2 className="size-5 animate-spin" aria-hidden /> {label}
    </div>
  );
}

// GETs a path and keeps the answer; `reload` fetches it again.
export function useLoad<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [tick, setTick] = useState(0);

  // The page component can stay mounted while the path changes (e.g. from
  // edit?id=X to the bare "new" page), so drop the previous path's result.
  // Reloads keep their data; only a different path clears it.
  const [seen, setSeen] = useState(path);
  if (seen !== path) {
    setSeen(path);
    setData(null);
    setError(null);
  }

  useEffect(() => {
    if (!path) return;
    let live = true;
    void api<T>(path).then((res) => {
      if (!live) return;
      if (res.ok) {
        setData(res.data);
        setError(null);
      } else setError(res.error);
    });
    return () => {
      live = false;
    };
  }, [path, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, error, reload, setData };
}

// Runs a write and keeps its error and field errors for the form.
export function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  const run = useCallback(async <T,>(call: () => Promise<ApiResult<T>>) => {
    setBusy(true);
    setError(null);
    setFields({});
    const res = await call();
    setBusy(false);
    if (!res.ok) {
      setError(res.error.error);
      setFields(res.error.fields ?? {});
      return null;
    }
    return res.data;
  }, []);

  const reset = useCallback(() => {
    setError(null);
    setFields({});
  }, []);

  // A problem caught before calling the API, shown the same way.
  const fail = useCallback((message: string, fieldErrors: Record<string, string> = {}) => {
    setError(message);
    setFields(fieldErrors);
  }, []);

  return { busy, error, fields, run, reset, fail };
}

// Query-string helper for list filters.
export function query(params: Record<string, string | number | undefined | null | false>) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== "" && v !== false) q.set(k, String(v));
  const s = q.toString();
  return s ? `?${s}` : "";
}
