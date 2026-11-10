"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import { formatINR } from "@/lib/catalog";
import {
  type AdminCategory,
  type AdminProduct,
  type AdminSku,
  type CatalogStatus,
  formatGrams,
  paiseToRupees,
  rupeesToPaise,
} from "@/lib/admin";
import { PhotoManager } from "@/components/admin/photo-manager";
import { Alert, Button, Card, Field, FieldScope, Loading, PageHeader, Pill, statusTone, useAction, useLoad } from "@/components/admin/ui";

// id is null on the "new product" page.
export function ProductEditor({ id = null }: { id?: string | null }) {
  const product = useLoad<{ product: AdminProduct }>(id ? `/admin/products/${id}` : null);
  const categories = useLoad<{ items: AdminCategory[] }>("/admin/categories");
  const back = { href: "/admin/products", label: "Products" };

  if (product.error || categories.error) {
    return (
      <>
        <PageHeader title="Product" back={back} />
        <Alert>{(product.error ?? categories.error)!.error}</Alert>
      </>
    );
  }
  if ((id && !product.data) || !categories.data) return <Loading />;

  const p = product.data?.product;
  const replace = (next: AdminProduct) => product.setData({ product: next });

  return (
    <>
      <PageHeader title={p ? p.name : "Create product"} back={back}>
        {p && (
          <a href={`/products/${p.slug}`} target="_blank" rel="noreferrer" className="text-[15px] font-semibold text-leaf-800 hover:underline">
            View in store ↗
          </a>
        )}
      </PageHeader>
      <div className="grid gap-6 2xl:grid-cols-[1fr_480px]">
        <ProductForm key={p?.id ?? "new"} product={p} categories={categories.data.items} onSaved={replace} />
        {p && (
          <div className="space-y-6">
            <Sizes product={p} onChange={replace} />
            <Photos product={p} onChange={replace} />
          </div>
        )}
      </div>
    </>
  );
}

const TEXTURES = ["powder", "paste", "honey", "ghee"] as const;

function ProductForm({ product, categories, onSaved }: { product?: AdminProduct; categories: AdminCategory[]; onSaved: (p: AdminProduct) => void }) {
  const router = useRouter();
  const [v, setV] = useState(() => ({
    name: product?.name ?? "",
    nameTe: product?.nameTe ?? "",
    slug: product?.slug ?? "",
    categorySlug: product?.category.slug ?? categories[0]?.slug ?? "",
    short: product?.short ?? "",
    description: product?.description ?? "",
    uses: (product?.uses ?? []).join("\n"),
    texture: product?.texture ?? "powder",
    fill: product?.colors.fill ?? "#E8A514",
    fillDeep: product?.colors.fillDeep ?? "#B97A0B",
    tint: product?.colors.tint ?? "#FBE7A1",
    hsnCode: product?.hsnCode ?? "",
    gstPercent: product?.gstRateBp === null || product?.gstRateBp === undefined ? "" : String(product.gstRateBp / 100),
    status: (product?.status ?? "draft") as CatalogStatus,
    sortOrder: String(product?.sortOrder ?? 100),
    seoTitle: product?.seoTitle ?? "",
    seoDescription: product?.seoDescription ?? "",
  }));
  const [saved, setSaved] = useState(false);
  const action = useAction();
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setSaved(false);
    setV((s) => ({ ...s, [k]: e.target.value }));
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const body = {
      name: v.name,
      nameTe: v.nameTe,
      slug: v.slug,
      categorySlug: v.categorySlug,
      short: v.short,
      description: v.description,
      uses: v.uses.split("\n").map((u) => u.trim()).filter(Boolean),
      texture: v.texture,
      colors: { fill: v.fill, fillDeep: v.fillDeep, tint: v.tint },
      hsnCode: v.hsnCode.trim() || null,
      ...(v.gstPercent.trim() && { gstRateBp: Math.round(Number(v.gstPercent) * 100) }),
      status: v.status,
      sortOrder: Number(v.sortOrder) || 0,
      seoTitle: v.seoTitle.trim() || null,
      seoDescription: v.seoDescription.trim() || null,
    };
    const res = product
      ? await action.run(() => api<{ product: AdminProduct }>(`/admin/products/${product.id}`, { method: "PATCH", body: { ...body, version: product.version } }))
      : await action.run(() => api<{ product: AdminProduct }>("/admin/products", { method: "POST", body }));
    if (!res) return;
    if (product) {
      onSaved(res.product);
      setSaved(true);
    } else router.replace(`/admin/products/edit?id=${res.product.id}`);
  }

  const f = action.fields;
  return (
    <Card title="Details">
      <form onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" name="name" errors={f}>
          {(p) => <input {...p} value={v.name} onChange={set("name")} />}
        </Field>
        <Field label="Name in Telugu" name="nameTe" errors={f}>
          {(p) => <input {...p} lang="te" value={v.nameTe} onChange={set("nameTe")} />}
        </Field>
        <Field label="Link" name="slug" errors={f} hint={product ? "Changing it breaks old links to this product." : "e.g. turmeric-powder"}>
          {(p) => <input {...p} value={v.slug} onChange={set("slug")} />}
        </Field>
        <Field label="Category" name="categorySlug" errors={f}>
          {(p) => (
            <select {...p} value={v.categorySlug} onChange={set("categorySlug")}>
              {categories.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label="Short description" name="short" errors={f} className="sm:col-span-2">
          {(p) => <input {...p} value={v.short} onChange={set("short")} />}
        </Field>
        <Field label="Description" name="description" errors={f} className="sm:col-span-2">
          {(p) => <textarea {...p} rows={6} className={`${p.className} h-auto py-2`} value={v.description} onChange={set("description")} />}
        </Field>
        <Field label="Uses (one per line)" name="uses" errors={f} className="sm:col-span-2">
          {(p) => <textarea {...p} rows={3} className={`${p.className} h-auto py-2`} value={v.uses} onChange={set("uses")} />}
        </Field>
        <Field label="Texture (decides the jar drawing)" name="texture" errors={f}>
          {(p) => (
            <select {...p} value={v.texture} onChange={set("texture")}>
              {TEXTURES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          )}
        </Field>
        <div>
          <span className="mb-1 block text-sm font-semibold text-ink">Jar colours</span>
          <div className="flex gap-3">
            {(["fill", "fillDeep", "tint"] as const).map((k) => (
              <label key={k} className="flex items-center gap-1.5 text-[13px] text-ink-soft">
                <input type="color" value={v[k]} onChange={set(k)} className="h-10 w-12 cursor-pointer rounded border border-line" />
                {{ fill: "Fill", fillDeep: "Shade", tint: "Tint" }[k]}
              </label>
            ))}
          </div>
          {Object.entries(f)
            .filter(([k]) => k.startsWith("colors"))
            .map(([k, m]) => (
              <p key={k} className="mt-1 text-sm font-medium text-chilli-700">
                {m}
              </p>
            ))}
        </div>
        <Field label="HSN code" name="hsnCode" errors={f} hint="Confirm with your CA.">
          {(p) => <input {...p} inputMode="numeric" value={v.hsnCode} onChange={set("hsnCode")} />}
        </Field>
        <Field label="GST rate (%)" name="gstRateBp" errors={f} hint="e.g. 5 or 12">
          {(p) => <input {...p} inputMode="decimal" value={v.gstPercent} onChange={set("gstPercent")} />}
        </Field>
        <Field label="Status" name="status" errors={f} hint="Only active products show in the store.">
          {(p) => (
            <select {...p} value={v.status} onChange={set("status")}>
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
          )}
        </Field>
        <Field label="Sort order" name="sortOrder" errors={f} hint="Lower comes first.">
          {(p) => <input {...p} inputMode="numeric" value={v.sortOrder} onChange={set("sortOrder")} />}
        </Field>
        <Field label="SEO title (optional)" name="seoTitle" errors={f} className="sm:col-span-2">
          {(p) => <input {...p} value={v.seoTitle} onChange={set("seoTitle")} />}
        </Field>
        <Field label="SEO description (optional)" name="seoDescription" errors={f} className="sm:col-span-2">
          {(p) => <textarea {...p} rows={2} className={`${p.className} h-auto py-2`} value={v.seoDescription} onChange={set("seoDescription")} />}
        </Field>
        <div className="space-y-3 sm:col-span-2">
          {action.error && <Alert>{action.error}</Alert>}
          {saved && <Alert kind="ok">Saved. The store updates within a few seconds.</Alert>}
          <Button type="submit" busy={action.busy}>
            {product ? "Save details" : "Create product"}
          </Button>
          {!product && <p className="text-[13px] text-ink-mute">You can add sizes and photos once the product is created.</p>}
        </div>
      </form>
    </Card>
  );
}

function Sizes({ product, onChange }: { product: AdminProduct; onChange: (p: AdminProduct) => void }) {
  const [adding, setAdding] = useState(false);
  return (
    <Card title="Sizes and prices" actions={!adding && <Button kind="secondary" onClick={() => setAdding(true)}>Add a size</Button>}>
      {product.skus.length === 0 && !adding && <p className="text-[15px] text-ink-soft">No sizes yet. Add one so the product can be sold.</p>}
      <ul className="space-y-3">
        {product.skus.map((s) => (
          <SkuRow key={`${s.id}:${s.version}`} sku={s} onChange={onChange} />
        ))}
      </ul>
      {adding && <NewSku productId={product.id} onDone={(p) => { setAdding(false); if (p) onChange(p); }} />}
    </Card>
  );
}

// Prices are typed in rupees; the API takes paise.
function prices(mrp: string, price: string) {
  const mrpPaise = rupeesToPaise(mrp);
  const pricePaise = rupeesToPaise(price);
  const fields: Record<string, string> = {};
  if (mrpPaise === null) fields.mrpPaise = "Enter an amount in rupees, e.g. 299 or 299.50.";
  if (pricePaise === null) fields.pricePaise = "Enter an amount in rupees, e.g. 249 or 249.50.";
  return { mrpPaise, pricePaise, fields };
}

function SkuRow({ sku, onChange }: { sku: AdminSku; onChange: (p: AdminProduct) => void }) {
  const [open, setOpen] = useState(false);
  const [v, setV] = useState({
    label: sku.label,
    netGrams: String(sku.netGrams),
    mrp: paiseToRupees(sku.mrpPaise),
    price: paiseToRupees(sku.pricePaise),
    status: sku.status,
    sortOrder: String(sku.sortOrder),
  });
  const action = useAction();

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const { mrpPaise, pricePaise, fields } = prices(v.mrp, v.price);
    if (mrpPaise === null || pricePaise === null) return action.fail("Please check the highlighted fields.", fields);
    const res = await action.run(() =>
      api<{ product: AdminProduct }>(`/admin/skus/${sku.id}`, {
        method: "PATCH",
        body: {
          version: sku.version,
          label: v.label,
          netGrams: Number(v.netGrams),
          mrpPaise,
          pricePaise,
          status: v.status,
          sortOrder: Number(v.sortOrder) || 0,
        },
      }),
    );
    if (res) onChange(res.product);
  }

  if (!open) {
    return (
      <li className="flex items-center justify-between gap-3 rounded-xl border border-line px-4 py-3">
        <div>
          <p className="font-semibold">
            {sku.label} <span className="tabular font-normal text-ink-mute">· {sku.code} · {formatGrams(sku.netGrams)}</span>
          </p>
          <p className="tabular text-[15px]">
            {formatINR(sku.pricePaise)}
            {sku.mrpPaise > sku.pricePaise && <span className="ml-2 text-ink-mute line-through">{formatINR(sku.mrpPaise)}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Pill tone={statusTone(sku.status)}>{sku.status}</Pill>
          <Button kind="ghost" onClick={() => setOpen(true)}>
            Edit
          </Button>
        </div>
      </li>
    );
  }

  const f = action.fields;
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setV((s) => ({ ...s, [k]: e.target.value }));
  return (
    <li className="rounded-xl border-2 border-leaf-700 p-4">
      <p className="tabular mb-3 text-sm font-semibold text-ink-mute">{sku.code}</p>
      <FieldScope id={sku.id}>
      <form onSubmit={save} noValidate className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Field label="Label" name={`label`} errors={f}>
          {(p) => <input {...p} value={v.label} onChange={set("label")} />}
        </Field>
        <Field label="Net grams" name="netGrams" errors={f}>
          {(p) => <input {...p} inputMode="numeric" value={v.netGrams} onChange={set("netGrams")} />}
        </Field>
        <Field label="Status" name="status" errors={f}>
          {(p) => (
            <select {...p} value={v.status} onChange={set("status")}>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
          )}
        </Field>
        <Field label="MRP (₹)" name="mrpPaise" errors={f}>
          {(p) => <input {...p} inputMode="decimal" value={v.mrp} onChange={set("mrp")} />}
        </Field>
        <Field label="Price (₹)" name="pricePaise" errors={f}>
          {(p) => <input {...p} inputMode="decimal" value={v.price} onChange={set("price")} />}
        </Field>
        <Field label="Sort order" name="sortOrder" errors={f}>
          {(p) => <input {...p} inputMode="numeric" value={v.sortOrder} onChange={set("sortOrder")} />}
        </Field>
        <div className="col-span-full space-y-2">
          {action.error && <Alert>{action.error}</Alert>}
          <div className="flex gap-2">
            <Button type="submit" busy={action.busy}>
              Save size
            </Button>
            <Button kind="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </form>
      </FieldScope>
    </li>
  );
}

function NewSku({ productId, onDone }: { productId: string; onDone: (p: AdminProduct | null) => void }) {
  const [v, setV] = useState({ code: "", label: "", netGrams: "", mrp: "", price: "" });
  const action = useAction();
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => setV((s) => ({ ...s, [k]: e.target.value }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const { mrpPaise, pricePaise, fields } = prices(v.mrp, v.price);
    if (mrpPaise === null || pricePaise === null) return action.fail("Please check the highlighted fields.", fields);
    const res = await action.run(() =>
      api<{ product: AdminProduct }>(`/admin/products/${productId}/skus`, {
        method: "POST",
        body: {
          code: v.code.toUpperCase(),
          label: v.label,
          netGrams: Number(v.netGrams),
          mrpPaise,
          pricePaise,
          status: "active",
        },
      }),
    );
    if (res) onDone(res.product);
  }

  const f = action.fields;
  return (
    <FieldScope id="new-sku">
    <form onSubmit={save} noValidate className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-leaf-50 p-4 sm:grid-cols-3">
      <Field label="Code" name="code" errors={f} hint="e.g. TURM-500G">
        {(p) => <input {...p} value={v.code} onChange={set("code")} className={`${p.className} uppercase`} />}
      </Field>
      <Field label="Label" name="label" errors={f} hint="e.g. 500 g">
        {(p) => <input {...p} value={v.label} onChange={set("label")} />}
      </Field>
      <Field label="Net grams" name="netGrams" errors={f}>
        {(p) => <input {...p} inputMode="numeric" value={v.netGrams} onChange={set("netGrams")} />}
      </Field>
      <Field label="MRP (₹)" name="mrpPaise" errors={f}>
        {(p) => <input {...p} inputMode="decimal" value={v.mrp} onChange={set("mrp")} />}
      </Field>
      <Field label="Price (₹)" name="pricePaise" errors={f}>
        {(p) => <input {...p} inputMode="decimal" value={v.price} onChange={set("price")} />}
      </Field>
      <div className="col-span-full space-y-2">
        {action.error && <Alert>{action.error}</Alert>}
        <div className="flex gap-2">
          <Button type="submit" busy={action.busy}>
            Add size
          </Button>
          <Button kind="ghost" onClick={() => onDone(null)}>
            Cancel
          </Button>
        </div>
      </div>
    </form>
    </FieldScope>
  );
}

function Photos({ product, onChange }: { product: AdminProduct; onChange: (p: AdminProduct) => void }) {
  return <PhotoManager basePath={`/admin/products/${product.id}`} images={product.images} field="product" onChange={onChange} empty="No photos. The store shows the drawn jar instead." />;
}
