"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { api } from "@/lib/api";
import { formatINR } from "@/lib/catalog";
import { formatDate } from "@/lib/orders";
import {
  type AppliesTo,
  type Coupon,
  fromLocalInput,
  paiseToRupees,
  type PromoStatus,
  rupeesToPaise,
  toLocalInput,
} from "@/lib/admin";
import { Alert, Button, Card, control, Field, FieldScope, Loading, PageHeader, Pill, query, statusTone, Table, td, useAction, useLoad } from "@/components/admin/ui";
import { AppliesToPicker, describeAppliesTo, nestedError } from "@/components/admin/AppliesToPicker";

function describe(c: Coupon) {
  if (c.type === "percent") return `${c.value}% off${c.maxDiscountPaise ? ` (up to ${formatINR(c.maxDiscountPaise)})` : ""}`;
  if (c.type === "flat") return `${formatINR(c.value)} off`;
  return "Free delivery";
}

function period(c: { startsAt: string | null; endsAt: string | null }) {
  if (!c.startsAt && !c.endsAt) return "Always";
  return `${c.startsAt ? formatDate(c.startsAt) : "now"} – ${c.endsAt ? formatDate(c.endsAt) : "no end"}`;
}

export default function AdminCouponsPage() {
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const { data, error, reload } = useLoad<{ items: Coupon[] }>(`/admin/coupons${query({ status, q })}`);
  const [editing, setEditing] = useState<Coupon | "new" | null>(null);

  return (
    <>
      <PageHeader title="Coupons">
        <Button onClick={() => setEditing("new")}>
          <Plus className="size-4" aria-hidden /> New coupon
        </Button>
      </PageHeader>

      <div className="mb-4 grid gap-3 rounded-2xl bg-leaf-50 p-4 sm:grid-cols-[2fr_1fr]">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setQ(search.trim());
          }}
        >
          <label htmlFor="c-q" className="mb-1 block text-sm font-semibold">
            Search
          </label>
          <input id="c-q" type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Code or description" className={control()} />
        </form>
        <div>
          <label htmlFor="c-status" className="mb-1 block text-sm font-semibold">
            Status
          </label>
          <select id="c-status" value={status} onChange={(e) => setStatus(e.target.value)} className={control()}>
            <option value="">Any</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      <div className="grid gap-6 2xl:grid-cols-[1fr_480px]">
        <div>
          {error ? (
            <Alert>{error.error}</Alert>
          ) : !data ? (
            <Loading />
          ) : (
            <Table head={["Code", "Discount", "Rules", "Used", "Status"]} empty={data.items.length === 0 && "No coupons yet."}>
              {data.items.map((c) => (
                <tr key={c.id} className="hover:bg-leaf-50">
                  <td className={td}>
                    <button type="button" onClick={() => setEditing(c)} className="tabular font-semibold text-leaf-800 hover:underline">
                      {c.code}
                    </button>
                    {c.description && <p className="max-w-[24ch] text-[13px] text-ink-mute">{c.description}</p>}
                  </td>
                  <td className={td}>
                    {describe(c)}
                    <p className="text-[13px] text-ink-mute">{describeAppliesTo(c.appliesTo)}</p>
                  </td>
                  <td className={`${td} text-[13px] text-ink-soft`}>
                    {period(c)}
                    {c.minSubtotalPaise && <span className="block">Min. order {formatINR(c.minSubtotalPaise)}</span>}
                    {c.firstOrderOnly && <span className="block">First order only</span>}
                    {c.perUserLimit && <span className="block">{c.perUserLimit} per customer</span>}
                  </td>
                  <td className={`${td} tabular`}>
                    {c.usage.confirmed}
                    {c.usageLimit && ` / ${c.usageLimit}`}
                    {c.usage.reserved > 0 && <p className="text-[13px] text-ink-mute">{c.usage.reserved} at checkout</p>}
                  </td>
                  <td className={td}>
                    <Pill tone={statusTone(c.status)}>{c.status}</Pill>
                  </td>
                </tr>
              ))}
            </Table>
          )}
        </div>
        {editing && (
          <CouponForm
            key={editing === "new" ? "new" : editing.id}
            coupon={editing === "new" ? undefined : editing}
            onClose={() => setEditing(null)}
            onSaved={(c) => {
              setEditing(c);
              reload();
            }}
          />
        )}
      </div>
    </>
  );
}

function CouponForm({ coupon, onClose, onSaved }: { coupon?: Coupon; onClose: () => void; onSaved: (c: Coupon) => void }) {
  const [v, setV] = useState(() => ({
    code: coupon?.code ?? "",
    description: coupon?.description ?? "",
    type: coupon?.type ?? "percent",
    value: coupon ? (coupon.type === "flat" ? paiseToRupees(coupon.value) : coupon.type === "percent" ? String(coupon.value) : "") : "",
    minSubtotal: paiseToRupees(coupon?.minSubtotalPaise),
    maxDiscount: paiseToRupees(coupon?.maxDiscountPaise),
    startsAt: toLocalInput(coupon?.startsAt ?? null),
    endsAt: toLocalInput(coupon?.endsAt ?? null),
    usageLimit: coupon?.usageLimit ? String(coupon.usageLimit) : "",
    perUserLimit: coupon?.perUserLimit ? String(coupon.perUserLimit) : "",
    firstOrderOnly: coupon?.firstOrderOnly ?? false,
    stackable: coupon?.stackable ?? false,
    status: (coupon?.status ?? "active") as PromoStatus,
  }));
  const [appliesTo, setAppliesTo] = useState<AppliesTo>(coupon?.appliesTo ?? { kind: "all" });
  const [saved, setSaved] = useState(false);
  const action = useAction();
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setSaved(false);
    setV((s) => ({ ...s, [k]: e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value }));
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const money = (s: string, field: string, errors: Record<string, string>) => {
      if (!s.trim()) return null;
      const p = rupeesToPaise(s);
      if (p === null) errors[field] = "Enter an amount in rupees.";
      return p;
    };
    const errors: Record<string, string> = {};
    const value = v.type === "flat" ? money(v.value, "value", errors) : v.type === "percent" ? Number(v.value) : 0;
    const minSubtotalPaise = money(v.minSubtotal, "minSubtotalPaise", errors);
    const maxDiscountPaise = v.type === "percent" ? money(v.maxDiscount, "maxDiscountPaise", errors) : null;
    if (Object.keys(errors).length) return action.fail("Please check the highlighted fields.", errors);

    const body = {
      description: v.description.trim() || null,
      type: v.type,
      value: value ?? 0,
      minSubtotalPaise,
      maxDiscountPaise,
      startsAt: fromLocalInput(v.startsAt),
      endsAt: fromLocalInput(v.endsAt),
      usageLimit: v.usageLimit.trim() ? Number(v.usageLimit) : null,
      perUserLimit: v.perUserLimit.trim() ? Number(v.perUserLimit) : null,
      firstOrderOnly: v.firstOrderOnly,
      stackable: v.stackable,
      appliesTo,
      status: v.status,
    };
    const res = coupon
      ? await action.run(() => api<{ coupon: Coupon }>(`/admin/coupons/${coupon.id}`, { method: "PATCH", body: { ...body, version: coupon.version } }))
      : await action.run(() => api<{ coupon: Coupon }>("/admin/coupons", { method: "POST", body: { ...body, code: v.code } }));
    if (res) {
      onSaved(res.coupon);
      setSaved(true);
    }
  }

  const f = action.fields;
  return (
    <Card title={coupon ? coupon.code : "New coupon"} actions={<Button kind="ghost" onClick={onClose}>Close</Button>} className="h-fit 2xl:sticky 2xl:top-24">
      <FieldScope id="coupon">
        <form onSubmit={submit} noValidate className="grid gap-3 sm:grid-cols-2">
          {!coupon && (
            <Field label="Code" name="code" errors={f} hint="e.g. DIWALI10" className="sm:col-span-2">
              {(p) => <input {...p} value={v.code} onChange={set("code")} className={`${p.className} uppercase`} />}
            </Field>
          )}
          <Field label="Description (for you)" name="description" errors={f} className="sm:col-span-2">
            {(p) => <input {...p} value={v.description} onChange={set("description")} />}
          </Field>
          <Field label="Type" name="type" errors={f}>
            {(p) => (
              <select {...p} value={v.type} onChange={set("type")}>
                <option value="percent">Percentage off</option>
                <option value="flat">Amount off</option>
                <option value="free_shipping">Free delivery</option>
              </select>
            )}
          </Field>
          {v.type !== "free_shipping" ? (
            <Field label={v.type === "percent" ? "Percent off" : "Amount off (₹)"} name="value" errors={f}>
              {(p) => <input {...p} inputMode="decimal" value={v.value} onChange={set("value")} />}
            </Field>
          ) : (
            <div />
          )}
          <Field label="Minimum order (₹, optional)" name="minSubtotalPaise" errors={f}>
            {(p) => <input {...p} inputMode="decimal" value={v.minSubtotal} onChange={set("minSubtotal")} />}
          </Field>
          {v.type === "percent" && (
            <Field label="Maximum discount (₹, optional)" name="maxDiscountPaise" errors={f}>
              {(p) => <input {...p} inputMode="decimal" value={v.maxDiscount} onChange={set("maxDiscount")} />}
            </Field>
          )}
          <Field label="Starts (optional)" name="startsAt" errors={f} className="sm:col-start-1">
            {(p) => <input {...p} type="datetime-local" value={v.startsAt} onChange={set("startsAt")} />}
          </Field>
          <Field label="Ends (optional)" name="endsAt" errors={f}>
            {(p) => <input {...p} type="datetime-local" value={v.endsAt} onChange={set("endsAt")} />}
          </Field>
          <Field label="Total uses (optional)" name="usageLimit" errors={f}>
            {(p) => <input {...p} inputMode="numeric" value={v.usageLimit} onChange={set("usageLimit")} />}
          </Field>
          <Field label="Uses per customer (optional)" name="perUserLimit" errors={f}>
            {(p) => <input {...p} inputMode="numeric" value={v.perUserLimit} onChange={set("perUserLimit")} />}
          </Field>
          <div className="sm:col-span-2">
            <AppliesToPicker
              value={appliesTo}
              onChange={(a) => {
                setSaved(false);
                setAppliesTo(a);
              }}
              error={nestedError(f, "appliesTo")}
            />
          </div>
          <label className="flex items-center gap-2 text-[15px]">
            <input type="checkbox" checked={v.firstOrderOnly} onChange={set("firstOrderOnly")} className="size-4 accent-leaf-800" />
            First order only
          </label>
          <label className="flex items-center gap-2 text-[15px]">
            <input type="checkbox" checked={v.stackable} onChange={set("stackable")} className="size-4 accent-leaf-800" />
            Works with automatic offers
          </label>
          <Field label="Status" name="status" errors={f}>
            {(p) => (
              <select {...p} value={v.status} onChange={set("status")}>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="archived">Archived</option>
              </select>
            )}
          </Field>
          <div className="space-y-2 sm:col-span-2">
            {action.error && <Alert>{action.error}</Alert>}
            {saved && <Alert kind="ok">Saved.</Alert>}
            <Button type="submit" busy={action.busy}>
              {coupon ? "Save coupon" : "Create coupon"}
            </Button>
          </div>
        </form>
      </FieldScope>
    </Card>
  );
}
