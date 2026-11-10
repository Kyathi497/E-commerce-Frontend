"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import type { AdminCategory, CatalogStatus } from "@/lib/admin";
import { Alert, Button, Card, Field, FieldScope, Loading, PageHeader, Pill, statusTone, Table, td, useAction, useLoad } from "@/components/admin/ui";

export default function AdminCategoriesPage() {
  const { data, error, reload } = useLoad<{ items: AdminCategory[] }>("/admin/categories");
  const [editing, setEditing] = useState<string | null>(null);

  return (
    <>
      <PageHeader title="Categories" />
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div>
          {error ? (
            <Alert>{error.error}</Alert>
          ) : !data ? (
            <Loading />
          ) : (
            <Table head={["Category", "Products", "Sort", "Status", ""]} empty={data.items.length === 0 && "No categories yet."}>
              {data.items.map((c) =>
                editing === c.id ? (
                  <tr key={c.id}>
                    <td colSpan={5} className="p-4">
                      <CategoryForm
                        category={c}
                        onDone={() => {
                          setEditing(null);
                          reload();
                        }}
                      />
                    </td>
                  </tr>
                ) : (
                  <tr key={c.id} className="hover:bg-leaf-50">
                    <td className={td}>
                      <p className="font-semibold">{c.name}</p>
                      <p className="text-[13px] text-ink-mute">/shop?category={c.slug}</p>
                    </td>
                    <td className={`${td} tabular`}>{c.productCount}</td>
                    <td className={`${td} tabular`}>{c.sortOrder}</td>
                    <td className={td}>
                      <Pill tone={statusTone(c.status)}>{c.status}</Pill>
                    </td>
                    <td className={`${td} text-right`}>
                      <Button kind="ghost" onClick={() => setEditing(c.id)}>
                        Edit
                      </Button>
                    </td>
                  </tr>
                ),
              )}
            </Table>
          )}
        </div>
        <Card title="New category" className="h-fit">
          <CategoryForm onDone={reload} />
        </Card>
      </div>
    </>
  );
}

function CategoryForm({ category, onDone }: { category?: AdminCategory; onDone: () => void }) {
  const [v, setV] = useState({
    name: category?.name ?? "",
    slug: category?.slug ?? "",
    sortOrder: String(category?.sortOrder ?? 100),
    status: (category?.status ?? "active") as CatalogStatus,
  });
  const action = useAction();
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setV((s) => ({ ...s, [k]: e.target.value }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const common = { name: v.name, sortOrder: Number(v.sortOrder) || 0, status: v.status };
    const res = category
      ? await action.run(() => api(`/admin/categories/${category.id}`, { method: "PATCH", body: common }))
      : await action.run(() => api("/admin/categories", { method: "POST", body: { ...common, slug: v.slug } }));
    if (!res) return;
    if (!category) setV({ name: "", slug: "", sortOrder: "100", status: "active" });
    onDone();
  }

  const f = action.fields;
  return (
    <FieldScope id={category?.id ?? "new"}>
    <form onSubmit={onSubmit} noValidate className="grid gap-3 sm:grid-cols-2">
      <Field label="Name" name="name" errors={f}>
        {(p) => <input {...p} value={v.name} onChange={set("name")} />}
      </Field>
      {!category && (
        <Field label="Link" name="slug" errors={f} hint="e.g. spice-powders. Can't be changed later.">
          {(p) => <input {...p} value={v.slug} onChange={set("slug")} />}
        </Field>
      )}
      <Field label="Sort order" name="sortOrder" errors={f}>
        {(p) => <input {...p} inputMode="numeric" value={v.sortOrder} onChange={set("sortOrder")} />}
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
      <div className="space-y-2 sm:col-span-2">
        {action.error && <Alert>{action.error}</Alert>}
        <div className="flex gap-2">
          <Button type="submit" busy={action.busy}>
            {category ? "Save" : "Add category"}
          </Button>
          {category && (
            <Button kind="ghost" onClick={onDone}>
              Cancel
            </Button>
          )}
        </div>
      </div>
    </form>
    </FieldScope>
  );
}
