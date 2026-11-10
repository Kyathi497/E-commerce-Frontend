"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { api } from "@/lib/api";
import { formatINR } from "@/lib/catalog";
import { formatDate } from "@/lib/orders";
import {
  type AppliesTo,
  type AutoPromotion,
  type AutoRule,
  fromLocalInput,
  paiseToRupees,
  type PromoStatus,
  rupeesToPaise,
  toLocalInput,
} from "@/lib/admin";
import { Alert, Button, Card, Field, FieldScope, Loading, PageHeader, Pill, statusTone, Table, td, useAction, useLoad } from "@/components/admin/ui";
import { AppliesToPicker, describeAppliesTo, nestedError } from "@/components/admin/AppliesToPicker";

function describe(r: AutoRule) {
  if (r.type === "qty_percent") return `${r.percent}% off ${r.minQty}+ items (${describeAppliesTo(r.appliesTo).toLowerCase()})`;
  if (r.type === "subtotal_percent")
    return `${r.percent}% off orders over ${formatINR(r.minSubtotalPaise)}${r.maxDiscountPaise ? `, up to ${formatINR(r.maxDiscountPaise)}` : ""}`;
  return `Free delivery over ${formatINR(r.minSubtotalPaise)}`;
}

export default function AdminOffersPage() {
  const { data, error, reload } = useLoad<{ items: AutoPromotion[] }>("/admin/promotions");
  const [editing, setEditing] = useState<AutoPromotion | "new" | null>(null);

  return (
    <>
      <PageHeader title="Automatic offers">
        <Button onClick={() => setEditing("new")}>
          <Plus className="size-4" aria-hidden /> New offer
        </Button>
      </PageHeader>
      <p className="-mt-3 mb-5 max-w-[75ch] text-[15px] text-ink-soft">
        Offers apply on their own, without a code. When several match, the one with the lowest priority number wins.
      </p>

      <div className="grid gap-6 2xl:grid-cols-[1fr_460px]">
        <div>
          {error ? (
            <Alert>{error.error}</Alert>
          ) : !data ? (
            <Loading />
          ) : (
            <Table head={["Offer", "Rule", "When", "Priority", "Status"]} empty={data.items.length === 0 && "No offers yet."}>
              {data.items.map((o) => (
                <tr key={o.id} className="hover:bg-leaf-50">
                  <td className={td}>
                    <button type="button" onClick={() => setEditing(o)} className="text-left font-semibold text-leaf-800 hover:underline">
                      {o.name}
                    </button>
                    {o.description && <p className="max-w-[28ch] text-[13px] text-ink-mute">{o.description}</p>}
                  </td>
                  <td className={`${td} text-[15px]`}>{describe(o.rule)}</td>
                  <td className={`${td} text-[13px] text-ink-soft`}>
                    {!o.startsAt && !o.endsAt
                      ? "Always"
                      : `${o.startsAt ? formatDate(o.startsAt) : "now"} – ${o.endsAt ? formatDate(o.endsAt) : "no end"}`}
                  </td>
                  <td className={`${td} tabular`}>{o.priority}</td>
                  <td className={td}>
                    <Pill tone={statusTone(o.status)}>{o.status}</Pill>
                  </td>
                </tr>
              ))}
            </Table>
          )}
        </div>
        {editing && (
          <OfferForm
            key={editing === "new" ? "new" : editing.id}
            offer={editing === "new" ? undefined : editing}
            onClose={() => setEditing(null)}
            onSaved={(o) => {
              setEditing(o);
              reload();
            }}
          />
        )}
      </div>
    </>
  );
}

function OfferForm({ offer, onClose, onSaved }: { offer?: AutoPromotion; onClose: () => void; onSaved: (o: AutoPromotion) => void }) {
  const r = offer?.rule;
  const [v, setV] = useState(() => ({
    name: offer?.name ?? "",
    description: offer?.description ?? "",
    type: (r?.type ?? "subtotal_percent") as AutoRule["type"],
    percent: r && "percent" in r ? String(r.percent) : "",
    minQty: r?.type === "qty_percent" ? String(r.minQty) : "2",
    minSubtotal: r && "minSubtotalPaise" in r ? paiseToRupees(r.minSubtotalPaise) : "",
    maxDiscount: r?.type === "subtotal_percent" ? paiseToRupees(r.maxDiscountPaise) : "",
    startsAt: toLocalInput(offer?.startsAt ?? null),
    endsAt: toLocalInput(offer?.endsAt ?? null),
    priority: String(offer?.priority ?? 100),
    status: (offer?.status ?? "active") as PromoStatus,
  }));
  const [appliesTo, setAppliesTo] = useState<AppliesTo>(r?.type === "qty_percent" ? r.appliesTo : { kind: "all" });
  const [saved, setSaved] = useState(false);
  const action = useAction();
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setSaved(false);
    setV((s) => ({ ...s, [k]: e.target.value }));
  };

  function rule(): AutoRule | Record<string, string> {
    const errors: Record<string, string> = {};
    const percent = Number(v.percent);
    const minSubtotalPaise = rupeesToPaise(v.minSubtotal || "0");
    const maxDiscountPaise = v.maxDiscount.trim() ? rupeesToPaise(v.maxDiscount) : undefined;
    if (v.type !== "free_shipping" && !(Number.isInteger(percent) && percent >= 1 && percent <= 100)) errors["rule.percent"] = "Enter a whole percent from 1 to 100.";
    if (v.type !== "qty_percent" && minSubtotalPaise === null) errors["rule.minSubtotalPaise"] = "Enter an amount in rupees.";
    if (maxDiscountPaise === null) errors["rule.maxDiscountPaise"] = "Enter an amount in rupees, or leave it empty.";
    if (Object.keys(errors).length) return errors;
    if (v.type === "qty_percent") return { type: "qty_percent", minQty: Number(v.minQty), percent, appliesTo };
    if (v.type === "subtotal_percent")
      return { type: "subtotal_percent", minSubtotalPaise: minSubtotalPaise!, percent, ...(maxDiscountPaise && { maxDiscountPaise }) };
    return { type: "free_shipping", minSubtotalPaise: minSubtotalPaise! };
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const built = rule();
    if (!("type" in built)) return action.fail("Please check the highlighted fields.", built as Record<string, string>);
    const body = {
      name: v.name,
      description: v.description.trim() || null,
      rule: built,
      startsAt: fromLocalInput(v.startsAt),
      endsAt: fromLocalInput(v.endsAt),
      priority: Number(v.priority) || 0,
      status: v.status,
    };
    const res = offer
      ? await action.run(() => api<{ promotion: AutoPromotion }>(`/admin/promotions/${offer.id}`, { method: "PATCH", body: { ...body, version: offer.version } }))
      : await action.run(() => api<{ promotion: AutoPromotion }>("/admin/promotions", { method: "POST", body }));
    if (res) {
      onSaved(res.promotion);
      setSaved(true);
    }
  }

  const f = action.fields;
  return (
    <Card title={offer ? offer.name : "New offer"} actions={<Button kind="ghost" onClick={onClose}>Close</Button>} className="h-fit 2xl:sticky 2xl:top-24">
      <FieldScope id="offer">
        <form onSubmit={submit} noValidate className="grid gap-3 sm:grid-cols-2">
          <Field label="Name" name="name" errors={f} className="sm:col-span-2" hint="e.g. “5% off orders over ₹1,500”.">
            {(p) => <input {...p} value={v.name} onChange={set("name")} />}
          </Field>
          <Field label="Description (optional)" name="description" errors={f} className="sm:col-span-2">
            {(p) => <input {...p} value={v.description} onChange={set("description")} />}
          </Field>
          <Field label="Kind" name="rule.type" errors={f} className="sm:col-span-2">
            {(p) => (
              <select {...p} value={v.type} onChange={set("type")}>
                <option value="subtotal_percent">Percent off orders over an amount</option>
                <option value="qty_percent">Percent off when buying several items</option>
                <option value="free_shipping">Free delivery over an amount</option>
              </select>
            )}
          </Field>
          {v.type !== "free_shipping" && (
            <Field label="Percent off" name="rule.percent" errors={f}>
              {(p) => <input {...p} inputMode="numeric" value={v.percent} onChange={set("percent")} />}
            </Field>
          )}
          {v.type === "qty_percent" ? (
            <Field label="Minimum items" name="rule.minQty" errors={f}>
              {(p) => <input {...p} inputMode="numeric" value={v.minQty} onChange={set("minQty")} />}
            </Field>
          ) : (
            <Field label="Order over (₹)" name="rule.minSubtotalPaise" errors={f}>
              {(p) => <input {...p} inputMode="decimal" value={v.minSubtotal} onChange={set("minSubtotal")} />}
            </Field>
          )}
          {v.type === "subtotal_percent" && (
            <Field label="Maximum discount (₹, optional)" name="rule.maxDiscountPaise" errors={f}>
              {(p) => <input {...p} inputMode="decimal" value={v.maxDiscount} onChange={set("maxDiscount")} />}
            </Field>
          )}
          {v.type === "qty_percent" && (
            <div className="sm:col-span-2">
              <AppliesToPicker
                value={appliesTo}
                onChange={(a) => {
                  setSaved(false);
                  setAppliesTo(a);
                }}
                error={nestedError(f, "rule.appliesTo")}
              />
            </div>
          )}
          <Field label="Starts (optional)" name="startsAt" errors={f} className="sm:col-start-1">
            {(p) => <input {...p} type="datetime-local" value={v.startsAt} onChange={set("startsAt")} />}
          </Field>
          <Field label="Ends (optional)" name="endsAt" errors={f}>
            {(p) => <input {...p} type="datetime-local" value={v.endsAt} onChange={set("endsAt")} />}
          </Field>
          <Field label="Priority" name="priority" errors={f} hint="Lower wins.">
            {(p) => <input {...p} inputMode="numeric" value={v.priority} onChange={set("priority")} />}
          </Field>
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
              {offer ? "Save offer" : "Create offer"}
            </Button>
          </div>
        </form>
      </FieldScope>
    </Card>
  );
}
