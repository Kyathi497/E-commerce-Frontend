"use client";

import Link from "next/link";
import { useState } from "react";
import { Plus } from "lucide-react";
import { formatINR } from "@/lib/catalog";
import type { AdminProduct } from "@/lib/admin";
import { Alert, btn, control, Loading, PageHeader, Pill, query, statusTone, Table, td, useLoad } from "@/components/admin/ui";

export default function AdminProductsPage() {
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const { data, error } = useLoad<{ items: AdminProduct[] }>(`/admin/products${query({ status, q, limit: 200 })}`);

  return (
    <>
      <PageHeader title="Products">
        <Link href="/admin/products/new" className={btn.primary}>
          <Plus className="size-4" aria-hidden /> New product
        </Link>
      </PageHeader>

      <div className="mb-4 grid gap-3 rounded-2xl bg-leaf-50 p-4 sm:grid-cols-[2fr_1fr]">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setQ(search.trim());
          }}
        >
          <label htmlFor="pr-q" className="mb-1 block text-sm font-semibold">
            Search
          </label>
          <input id="pr-q" type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name or link" className={control()} />
        </form>
        <div>
          <label htmlFor="pr-status" className="mb-1 block text-sm font-semibold">
            Status
          </label>
          <select id="pr-status" value={status} onChange={(e) => setStatus(e.target.value)} className={control()}>
            <option value="">Any</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      {error ? (
        <Alert>{error.error}</Alert>
      ) : !data ? (
        <Loading />
      ) : (
        <Table head={["Product", "Category", "Sizes", "Status"]} empty={data.items.length === 0 && "No products match."}>
          {data.items.map((p) => (
            <tr key={p.id} className="hover:bg-leaf-50">
              <td className={td}>
                <div className="flex items-center gap-3">
                  {p.images[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element -- already resized to 400/800 px WebP by catalog-service
                    <img src={p.images[0].src} alt="" className="size-11 rounded-lg object-cover" />
                  ) : (
                    <span className="size-11 rounded-lg" style={{ background: p.colors.tint }} aria-hidden />
                  )}
                  <div>
                    <Link href={`/admin/products/edit?id=${p.id}`} className="font-semibold text-leaf-800 hover:underline">
                      {p.name}
                    </Link>
                    <p className="text-[13px] text-ink-mute">/{p.slug}</p>
                  </div>
                </div>
              </td>
              <td className={td}>{p.category.name}</td>
              <td className={`${td} text-[13px]`}>
                {p.skus.map((s) => (
                  <span key={s.id} className={`tabular block ${s.status === "active" ? "" : "text-ink-mute line-through"}`}>
                    {s.label} · {formatINR(s.pricePaise)}
                  </span>
                ))}
              </td>
              <td className={td}>
                <Pill tone={statusTone(p.status)}>{p.status}</Pill>
              </td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
