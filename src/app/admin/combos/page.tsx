"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { formatINR } from "@/lib/catalog";
import { formatDate } from "@/lib/orders";
import { type AdminBundle, formatGrams } from "@/lib/admin";
import { Alert, btn, Loading, PageHeader, Pill, statusTone, Table, td, useLoad } from "@/components/admin/ui";

export default function AdminCombosPage() {
  const { data, error } = useLoad<{ items: AdminBundle[] }>("/admin/bundles");

  return (
    <>
      <PageHeader title="Combos">
        <Link href="/admin/combos/edit" className={btn.primary}>
          <Plus className="size-4" aria-hidden /> New combo
        </Link>
      </PageHeader>
      {error ? (
        <Alert>{error.error}</Alert>
      ) : !data ? (
        <Loading />
      ) : (
        <Table head={["Combo", "In the box", "Price", "On sale", "Status"]} empty={data.items.length === 0 && "No combos yet."}>
          {data.items.map((b) => (
            <tr key={b.id} className="hover:bg-leaf-50">
              <td className={td}>
                <div className="flex items-center gap-3">
                  <span className="size-9 shrink-0 rounded-lg" style={{ background: b.tint }} aria-hidden />
                  <div>
                    <Link href={`/admin/combos/edit?id=${b.id}`} className="font-semibold text-leaf-800 hover:underline">
                      {b.name}
                    </Link>
                    <p className="text-[13px] text-ink-mute">/{b.slug}</p>
                  </div>
                </div>
              </td>
              <td className={`${td} text-[13px] text-ink-soft`}>{b.items.map((i) => `${i.name} ${formatGrams(i.grams)}`).join(", ")}</td>
              <td className={`${td} tabular`}>
                {formatINR(b.pricePaise)}
                {b.compareAtPaise && <p className="text-[13px] text-ink-mute line-through">{formatINR(b.compareAtPaise)}</p>}
              </td>
              <td className={`${td} text-[13px] text-ink-soft`}>
                {b.availableFrom || b.availableUntil
                  ? `${b.availableFrom ? formatDate(b.availableFrom) : "now"} – ${b.availableUntil ? formatDate(b.availableUntil) : "no end"}`
                  : "Always"}
              </td>
              <td className={td}>
                <Pill tone={statusTone(b.status)}>{b.status}</Pill>
              </td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
