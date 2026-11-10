"use client";

import Link from "next/link";
import { useState } from "react";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/orders";
import type { AdminUser } from "@/lib/admin";
import { Alert, Button, control, Loading, PageHeader, Pill, query, statusTone, Table, td, useAction, useLoad } from "@/components/admin/ui";

type UserPage = { items: AdminUser[]; nextCursor: string | null };

export default function AdminCustomersPage() {
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const filters = { q, role, status };
  const qs = query(filters);
  const { data, error } = useLoad<UserPage>(`/admin/users${query({ ...filters, limit: 50 })}`);
  const [extra, setExtra] = useState<{ key: string; items: AdminUser[]; cursor: string | null } | null>(null);
  const more = useAction();

  const mine = extra?.key === qs ? extra : null;
  const items = [...(data?.items ?? []), ...(mine?.items ?? [])];
  const cursor = mine ? mine.cursor : (data?.nextCursor ?? null);

  async function loadMore() {
    const res = await more.run(() => api<UserPage>(`/admin/users${query({ ...filters, limit: 50, cursor })}`));
    if (res) setExtra({ key: qs, items: [...(mine?.items ?? []), ...res.items], cursor: res.nextCursor });
  }

  return (
    <>
      <PageHeader title="Customers" />
      <div className="mb-4 grid gap-3 rounded-2xl bg-leaf-50 p-4 sm:grid-cols-[2fr_1fr_1fr]">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setQ(search.trim());
          }}
        >
          <label htmlFor="u-q" className="mb-1 block text-sm font-semibold">
            Search
          </label>
          <input id="u-q" type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, email or phone" className={control()} />
        </form>
        <div>
          <label htmlFor="u-role" className="mb-1 block text-sm font-semibold">
            Role
          </label>
          <select id="u-role" value={role} onChange={(e) => setRole(e.target.value)} className={control()}>
            <option value="">Any</option>
            <option value="user">Customer</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div>
          <label htmlFor="u-status" className="mb-1 block text-sm font-semibold">
            Status
          </label>
          <select id="u-status" value={status} onChange={(e) => setStatus(e.target.value)} className={control()}>
            <option value="">Any</option>
            <option value="active">Active</option>
            <option value="locked">Locked</option>
            <option value="deleted">Deleted</option>
          </select>
        </div>
      </div>

      {error ? (
        <Alert>{error.error}</Alert>
      ) : !data ? (
        <Loading />
      ) : (
        <>
          <Table head={["Customer", "Phone", "Joined", "Status"]} empty={items.length === 0 && "No customers match."}>
            {items.map((u) => (
              <tr key={u.id} className="hover:bg-leaf-50">
                <td className={td}>
                  <Link href={`/admin/customers/view?id=${u.id}`} className="font-semibold text-leaf-800 hover:underline">
                    {u.name}
                  </Link>
                  <p className="text-[13px] text-ink-mute">
                    {u.email}
                    {!u.emailVerified && " · unconfirmed"}
                  </p>
                </td>
                <td className={`${td} tabular`}>{u.phone ?? "–"}</td>
                <td className={`${td} tabular text-ink-soft`}>{formatDate(u.createdAt)}</td>
                <td className={td}>
                  <span className="flex flex-wrap gap-1">
                    <Pill tone={statusTone(u.status)}>{u.status}</Pill>
                    {u.role === "admin" && <Pill tone="dark">admin</Pill>}
                  </span>
                </td>
              </tr>
            ))}
          </Table>
          {cursor && (
            <Button kind="secondary" busy={more.busy} onClick={() => void loadMore()} className="mt-4">
              Load more
            </Button>
          )}
        </>
      )}
    </>
  );
}
