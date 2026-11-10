"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { api } from "@/lib/api";
import { formatINR } from "@/lib/catalog";
import { formatDate, formatDateTime } from "@/lib/orders";
import { type AdminOrderSummary, type AdminUser, STATUS_NAME } from "@/lib/admin";
import type { SavedAddress } from "@/components/auth/AuthProvider";
import { useAuth } from "@/components/auth/AuthProvider";
import { Alert, Button, Card, Loading, PageHeader, Pill, statusTone, useAction, useLoad } from "@/components/admin/ui";
import { StatusBadge } from "@/components/orders/OrderParts";

interface Detail {
  user: AdminUser;
  addresses: SavedAddress[];
  activeSessions: number;
  activity: { id: string; action: string; at: string; actorId: string | null }[];
}

export default function AdminCustomerPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Customer />
    </Suspense>
  );
}

function Customer() {
  const id = useSearchParams().get("id");
  const { data, error, reload } = useLoad<Detail>(id ? `/admin/users/${id}` : null);
  const back = { href: "/admin/customers", label: "Customers" };

  if (!id || error) {
    return (
      <>
        <PageHeader title="Customer" back={back} />
        <Alert>{error?.error ?? "No customer given."}</Alert>
      </>
    );
  }
  if (!data) return <Loading />;

  const u = data.user;
  return (
    <>
      <PageHeader
        back={back}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {u.name}
            <Pill tone={statusTone(u.status)}>{u.status}</Pill>
            {u.role === "admin" && <Pill tone="dark">admin</Pill>}
          </span>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Card title="Account">
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 text-[15px]">
              <dt className="text-ink-mute">Email</dt>
              <dd>
                {u.email} {u.emailVerified ? <Pill tone="good">confirmed</Pill> : <Pill tone="warn">unconfirmed</Pill>}
              </dd>
              <dt className="text-ink-mute">Phone</dt>
              <dd className="tabular">{u.phone ?? "–"}</dd>
              <dt className="text-ink-mute">Joined</dt>
              <dd>{formatDate(u.createdAt)}</dd>
              <dt className="text-ink-mute">Signs in with</dt>
              <dd>{[u.hasPassword && "password", u.googleLinked && "Google"].filter(Boolean).join(" and ") || "–"}</dd>
              <dt className="text-ink-mute">Marketing emails</dt>
              <dd>{u.marketingOptIn ? "Yes" : "No"}</dd>
              <dt className="text-ink-mute">Signed in on</dt>
              <dd>
                {data.activeSessions} {data.activeSessions === 1 ? "device" : "devices"}
              </dd>
              {u.failedLogins > 0 && (
                <>
                  <dt className="text-ink-mute">Failed logins</dt>
                  <dd className="tabular">{u.failedLogins}</dd>
                </>
              )}
            </dl>
          </Card>

          <CustomerOrders email={u.email} />

          <Card title="Saved addresses">
            {data.addresses.length === 0 ? (
              <p className="text-[15px] text-ink-soft">None.</p>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2">
                {data.addresses.map((a) => (
                  <li key={a.id} className="rounded-xl border border-line p-3 text-[15px]">
                    <p className="font-semibold">
                      {a.label} {a.isDefault && <Pill tone="good">default</Pill>}
                    </p>
                    <p>{a.name}</p>
                    <p className="tabular text-ink-soft">{a.phone}</p>
                    <p className="text-ink-soft">
                      {[a.line1, a.line2, a.landmark].filter(Boolean).join(", ")}, {a.city}, {a.state} {a.pincode}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <AccessCard user={u} onChange={reload} />
          <Card title="Account activity">
            {data.activity.length === 0 ? (
              <p className="text-[15px] text-ink-soft">Nothing recorded.</p>
            ) : (
              <ul className="space-y-2 text-[15px]">
                {data.activity.map((a) => (
                  <li key={a.id}>
                    <span className="font-semibold">{a.action.replace(/[._]/g, " ")}</span>
                    <span className="tabular block text-[13px] text-ink-mute">
                      {formatDateTime(a.at)}
                      {a.actorId && a.actorId !== u.id && " · by an admin"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}

// Orders are matched by the contact email they were placed with.
function CustomerOrders({ email }: { email: string }) {
  const { data, error } = useLoad<{ items: AdminOrderSummary[] }>(`/admin/orders?q=${encodeURIComponent(email)}&limit=20`);
  return (
    <Card title="Orders" actions={<span className="text-[13px] text-ink-mute">placed with this email</span>}>
      {error ? (
        <Alert>{error.error}</Alert>
      ) : !data ? (
        <Loading />
      ) : data.items.length === 0 ? (
        <p className="text-[15px] text-ink-soft">No orders.</p>
      ) : (
        <ul className="divide-y divide-line">
          {data.items.map((o) => (
            <li key={o.number} className="flex items-center justify-between gap-3 py-2.5">
              <span>
                <Link href={`/admin/orders/view?number=${o.number}`} className="tabular font-semibold text-leaf-800 hover:underline">
                  {o.number}
                </Link>
                <span className="tabular block text-[13px] text-ink-mute">{formatDate(o.placedAt)}</span>
              </span>
              <span className="flex items-center gap-3">
                <StatusBadge status={o.status} label={STATUS_NAME[o.status]} />
                <span className="tabular font-semibold">{formatINR(o.totalPaise)}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function AccessCard({ user: u, onChange }: { user: AdminUser; onChange: () => void }) {
  const { user: me } = useAuth();
  const [confirm, setConfirm] = useState<"lock" | "role" | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const action = useAction();
  const self = me?.id === u.id;

  async function update(body: Record<string, unknown>, message: string) {
    setDone(null);
    const res = await action.run(() => api(`/admin/users/${u.id}`, { method: "PATCH", body }));
    if (res) {
      setConfirm(null);
      setDone(message);
      onChange();
    }
  }

  if (u.status === "deleted") {
    return (
      <Card title="Access">
        <p className="text-[15px] text-ink-soft">This account was deleted by its owner and can&apos;t be changed.</p>
      </Card>
    );
  }

  return (
    <Card title="Access">
      {self && <p className="mb-3 text-[15px] text-ink-soft">This is you. Another admin has to change your role or status.</p>}
      <div className="space-y-3">
        {confirm === "lock" ? (
          <div className="rounded-xl border-2 border-chilli-100 p-3">
            <p className="text-[15px]">Lock this account? They&apos;re signed out everywhere and can&apos;t log in until unlocked.</p>
            <div className="mt-2 flex gap-2">
              <Button kind="danger" busy={action.busy} onClick={() => void update({ status: "locked" }, "Account locked.")}>
                Lock account
              </Button>
              <Button kind="ghost" onClick={() => setConfirm(null)}>
                Back
              </Button>
            </div>
          </div>
        ) : confirm === "role" ? (
          <div className="rounded-xl border-2 border-turmeric-300 p-3">
            <p className="text-[15px]">
              {u.role === "admin"
                ? "Remove admin access? They keep their customer account."
                : "Give this person full admin access to orders, products, refunds and customers?"}
            </p>
            <div className="mt-2 flex gap-2">
              <Button
                kind="danger"
                busy={action.busy}
                onClick={() =>
                  void update(
                    { role: u.role === "admin" ? "user" : "admin", revokeSessions: true },
                    u.role === "admin" ? "Admin access removed." : "Admin access given. They need to log in again.",
                  )
                }
              >
                {u.role === "admin" ? "Remove admin" : "Make admin"}
              </Button>
              <Button kind="ghost" onClick={() => setConfirm(null)}>
                Back
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {u.status === "locked" ? (
              <Button kind="secondary" busy={action.busy} disabled={self} onClick={() => void update({ status: "active" }, "Account unlocked.")}>
                Unlock account
              </Button>
            ) : (
              <Button kind="secondary" disabled={self} onClick={() => setConfirm("lock")}>
                Lock account…
              </Button>
            )}
            <Button kind="secondary" disabled={self} onClick={() => setConfirm("role")}>
              {u.role === "admin" ? "Remove admin access…" : "Make admin…"}
            </Button>
            <Button kind="ghost" busy={action.busy} onClick={() => void update({ revokeSessions: true }, "Signed out on every device.")}>
              Sign out everywhere
            </Button>
          </div>
        )}
        {action.error && <Alert>{action.error}</Alert>}
        {done && <Alert kind="ok">{done}</Alert>}
      </div>
    </Card>
  );
}
