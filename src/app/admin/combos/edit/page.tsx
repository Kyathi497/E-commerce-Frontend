"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Plus, X } from "lucide-react";
import { api } from "@/lib/api";
import {
  type AdminBundle,
  type AdminProduct,
  type CatalogStatus,
  fromLocalInput,
  paiseToRupees,
  rupeesToPaise,
  toLocalInput,
} from "@/lib/admin";
import { PhotoManager } from "@/components/admin/photo-manager";
import { Alert, Button, Card, control, Field, Loading, PageHeader, useAction, useLoad } from "@/components/admin/ui";

export default function EditComboPage() {
  return (
    <Suspense fallback={<Loading />}>
      <EditCombo />
    </Suspense>
  );
}

function EditCombo() {
  const id = useSearchParams().get("id");
  const bundle = useLoad<{ bundle: AdminBundle }>(id ? `/admin/bundles/${id}` : null);
  const products = useLoad<{ items: AdminProduct[] }>("/admin/products?limit=200");
  const back = { href: "/admin/combos", label: "Combos" };

  if (bundle.error || products.error) {
    return (
      <>
        <PageHeader title="Combo" back={back} />
        <Alert>{(bundle.error ?? products.error)!.error}</Alert>
      </>
    );
  }
  if ((id && !bundle.data) || !products.data) return <Loading />;

  const b = bundle.data?.bundle;
  return (
    <>
      <PageHeader title={b ? b.name : "New combo"} back={back}>
        {b && (
          <a href={`/combos/${b.slug}`} target="_blank" rel="noreferrer" className="text-[15px] font-semibold text-leaf-800 hover:underline">
            View in store ↗
          </a>
        )}
      </PageHeader>
      <div className="space-y-6">
        <ComboForm key={b?.id ?? "new"} bundle={b} products={products.data.items} onSaved={(next) => bundle.setData({ bundle: next })} />
        {b && (
          <div className="max-w-xl">
            <PhotoManager<AdminBundle>
              basePath={`/admin/bundles/${b.id}`}
              field="bundle"
              images={b.images}
              empty="No photos. The store shows the combo's jars instead."
              onChange={(next) => bundle.setData({ bundle: next })}
            />
          </div>
        )}
      </div>
    </>
  );
}

interface Line {
  productSlug: string;
  grams: string;
  label: string;
}

function ComboForm({ bundle, products, onSaved }: { bundle?: AdminBundle; products: AdminProduct[]; onSaved: (b: AdminBundle) => void }) {
  const router = useRouter();
  const [v, setV] = useState(() => ({
    name: bundle?.name ?? "",
    slug: bundle?.slug ?? "",
    tagline: bundle?.tagline ?? "",
    price: paiseToRupees(bundle?.pricePaise),
    compareAt: paiseToRupees(bundle?.compareAtPaise),
    tint: bundle?.tint ?? "#FBE7A1",
    extras: (bundle?.extras ?? []).join("\n"),
    status: (bundle?.status ?? "draft") as CatalogStatus,
    sortOrder: String(bundle?.sortOrder ?? 100),
    availableFrom: toLocalInput(bundle?.availableFrom ?? null),
    availableUntil: toLocalInput(bundle?.availableUntil ?? null),
  }));
  const [lines, setLines] = useState<Line[]>(() =>
    bundle?.items.map((i) => ({ productSlug: i.slug, grams: String(i.grams), label: i.label })) ?? [{ productSlug: "", grams: "", label: "" }],
  );
  const [saved, setSaved] = useState(false);
  const action = useAction();
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setSaved(false);
    setV((s) => ({ ...s, [k]: e.target.value }));
  };
  const setLine = (i: number, patch: Partial<Line>) => {
    setSaved(false);
    setLines((ls) => ls.map((l, n) => (n === i ? { ...l, ...patch } : l)));
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const pricePaise = rupeesToPaise(v.price);
    const compareAtPaise = v.compareAt.trim() ? rupeesToPaise(v.compareAt) : null;
    if (pricePaise === null || (v.compareAt.trim() && compareAtPaise === null)) {
      return action.fail("Please check the highlighted fields.", {
        ...(pricePaise === null && { pricePaise: "Enter an amount in rupees, e.g. 999." }),
        ...(v.compareAt.trim() && compareAtPaise === null && { compareAtPaise: "Enter an amount in rupees, or leave it empty." }),
      });
    }
    const body = {
      name: v.name,
      slug: v.slug,
      tagline: v.tagline,
      pricePaise,
      compareAtPaise,
      tint: v.tint,
      extras: v.extras.split("\n").map((x) => x.trim()).filter(Boolean),
      status: v.status,
      sortOrder: Number(v.sortOrder) || 0,
      availableFrom: fromLocalInput(v.availableFrom),
      availableUntil: fromLocalInput(v.availableUntil),
      items: lines
        .filter((l) => l.productSlug)
        .map((l) => ({ productSlug: l.productSlug, grams: Number(l.grams), label: l.label })),
    };
    const res = bundle
      ? await action.run(() => api<{ bundle: AdminBundle }>(`/admin/bundles/${bundle.id}`, { method: "PATCH", body: { ...body, version: bundle.version } }))
      : await action.run(() => api<{ bundle: AdminBundle }>("/admin/bundles", { method: "POST", body }));
    if (!res) return;
    if (bundle) {
      onSaved(res.bundle);
      setSaved(true);
    } else router.replace(`/admin/combos/edit?id=${res.bundle.id}`);
  }

  const f = action.fields;
  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-6 xl:grid-cols-2">
      <Card title="Details">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" name="name" errors={f}>
            {(p) => <input {...p} value={v.name} onChange={set("name")} />}
          </Field>
          <Field label="Link" name="slug" errors={f} hint="e.g. kitchen-starter">
            {(p) => <input {...p} value={v.slug} onChange={set("slug")} />}
          </Field>
          <Field label="Tagline" name="tagline" errors={f} className="sm:col-span-2">
            {(p) => <input {...p} value={v.tagline} onChange={set("tagline")} />}
          </Field>
          <Field label="Price (₹)" name="pricePaise" errors={f}>
            {(p) => <input {...p} inputMode="decimal" value={v.price} onChange={set("price")} />}
          </Field>
          <Field label="Compare-at price (₹, optional)" name="compareAtPaise" errors={f} hint="Shown struck through.">
            {(p) => <input {...p} inputMode="decimal" value={v.compareAt} onChange={set("compareAt")} />}
          </Field>
          <Field label="Extras in the box (one per line)" name="extras" errors={f} className="sm:col-span-2">
            {(p) => <textarea {...p} rows={3} className={`${p.className} h-auto py-2`} value={v.extras} onChange={set("extras")} />}
          </Field>
          <Field label="Status" name="status" errors={f}>
            {(p) => (
              <select {...p} value={v.status} onChange={set("status")}>
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
            )}
          </Field>
          <div className="grid grid-cols-[auto_1fr] gap-3">
            <div>
              <label htmlFor="c-tint" className="mb-1 block text-sm font-semibold">
                Colour
              </label>
              <input id="c-tint" type="color" value={v.tint} onChange={set("tint")} className="h-10 w-12 cursor-pointer rounded border border-line" />
            </div>
            <Field label="Sort order" name="sortOrder" errors={f}>
              {(p) => <input {...p} inputMode="numeric" value={v.sortOrder} onChange={set("sortOrder")} />}
            </Field>
          </div>
          <Field label="On sale from (optional)" name="availableFrom" errors={f}>
            {(p) => <input {...p} type="datetime-local" value={v.availableFrom} onChange={set("availableFrom")} />}
          </Field>
          <Field label="On sale until (optional)" name="availableUntil" errors={f} hint="For festival hampers.">
            {(p) => <input {...p} type="datetime-local" value={v.availableUntil} onChange={set("availableUntil")} />}
          </Field>
        </div>
      </Card>

      <Card title="In the box">
        <ul className="space-y-3">
          {lines.map((l, i) => (
            <li key={i} className="grid grid-cols-[1fr_90px_100px_auto] items-end gap-2">
              <div>
                <label htmlFor={`l-p-${i}`} className="mb-1 block text-sm font-semibold">
                  Product
                </label>
                <select id={`l-p-${i}`} value={l.productSlug} onChange={(e) => setLine(i, { productSlug: e.target.value })} className={control(!!f[`items.${i}.productSlug`])}>
                  <option value="">Choose…</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.slug}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor={`l-g-${i}`} className="mb-1 block text-sm font-semibold">
                  Grams
                </label>
                <input id={`l-g-${i}`} inputMode="numeric" value={l.grams} onChange={(e) => setLine(i, { grams: e.target.value })} className={control(!!f[`items.${i}.grams`])} />
              </div>
              <div>
                <label htmlFor={`l-l-${i}`} className="mb-1 block text-sm font-semibold">
                  Label
                </label>
                <input id={`l-l-${i}`} value={l.label} onChange={(e) => setLine(i, { label: e.target.value })} placeholder="250 g" className={control(!!f[`items.${i}.label`])} />
              </div>
              <button
                type="button"
                onClick={() => setLines((ls) => ls.filter((_, n) => n !== i))}
                aria-label={`Remove line ${i + 1}`}
                className="grid size-10 place-items-center rounded-lg text-ink-mute hover:bg-chilli-100 hover:text-chilli-700"
              >
                <X className="size-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
        {Object.entries(f)
          .filter(([k]) => k.startsWith("items"))
          .map(([k, m]) => (
            <p key={k} className="mt-2 text-sm font-medium text-chilli-700">
              {k === "items" ? m : `Line ${Number(k.split(".")[1]) + 1}: ${m}`}
            </p>
          ))}
        <Button kind="secondary" className="mt-3" onClick={() => setLines((ls) => [...ls, { productSlug: "", grams: "", label: "" }])}>
          <Plus className="size-4" aria-hidden /> Add a product
        </Button>
      </Card>

      <div className="space-y-3 xl:col-span-2">
        {action.error && <Alert>{action.error}</Alert>}
        {saved && <Alert kind="ok">Saved. The store updates within a few seconds.</Alert>}
        <Button type="submit" busy={action.busy}>
          {bundle ? "Save combo" : "Create combo"}
        </Button>
      </div>
    </form>
  );
}
