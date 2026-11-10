"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Download, Plus } from "lucide-react";
import { api, download } from "@/lib/api";
import { formatDateTime } from "@/lib/orders";
import { formatQty, type StockItem, type StockMovement } from "@/lib/admin";
import {
  Alert,
  Button,
  Card,
  control,
  Field,
  FieldScope,
  Loading,
  PageHeader,
  Pill,
  query,
  Table,
  td,
  useAction,
  useLoad,
} from "@/components/admin/ui";

export default function AdminInventoryPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Inventory />
    </Suspense>
  );
}

const LEVEL = { in_stock: { tone: "good", label: "In stock" }, low: { tone: "warn", label: "Low" }, out: { tone: "bad", label: "Out" } } as const;

function Inventory() {
  const params = useSearchParams();
  const [kind, setKind] = useState("product");
  const [low, setLow] = useState(params.get("low") === "true");
  const [status, setStatus] = useState("active");
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const { data, error, reload } = useLoad<{ items: StockItem[] }>(`/admin/stock${query({ kind, low: low && "true", status, q })}`);
  const [selected, setSelected] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const exporting = useAction();

  const item = data?.items.find((i) => i.id === selected) ?? null;

  return (
    <>
      <PageHeader title="Inventory">
        <Button kind="secondary" onClick={() => setAdding((a) => !a)}>
          <Plus className="size-4" aria-hidden /> Packaging item
        </Button>
        <Button
          kind="secondary"
          busy={exporting.busy}
          onClick={() => void exporting.run(() => download("/admin/stock/export.csv", `tej-stock-${new Date().toISOString().slice(0, 10)}.csv`))}
        >
          <Download className="size-4" aria-hidden /> Export CSV
        </Button>
      </PageHeader>
      <p className="-mt-3 mb-5 max-w-[75ch] text-[15px] text-ink-soft">
        Product stock is kept in grams of the ground product, shared by every jar size. &ldquo;Held&rdquo; is set aside for
        orders waiting for payment or not yet packed.
      </p>

      {exporting.error && (
        <div className="mb-4">
          <Alert>{exporting.error}</Alert>
        </div>
      )}
      {adding && (
        <div className="mb-6">
          <NewPackaging
            onDone={() => {
              setAdding(false);
              setKind("packaging");
              reload();
            }}
          />
        </div>
      )}

      <div className="mb-4 grid gap-3 rounded-2xl bg-leaf-50 p-4 sm:grid-cols-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setQ(search.trim());
          }}
        >
          <label htmlFor="s-q" className="mb-1 block text-sm font-semibold">
            Search
          </label>
          <input id="s-q" type="search" value={search} onChange={(e) => setSearch(e.target.value)} className={control()} />
        </form>
        <div>
          <label htmlFor="s-kind" className="mb-1 block text-sm font-semibold">
            Kind
          </label>
          <select id="s-kind" value={kind} onChange={(e) => setKind(e.target.value)} className={control()}>
            <option value="product">Products</option>
            <option value="packaging">Packaging</option>
            <option value="">Everything</option>
          </select>
        </div>
        <div>
          <label htmlFor="s-status" className="mb-1 block text-sm font-semibold">
            Status
          </label>
          <select id="s-status" value={status} onChange={(e) => setStatus(e.target.value)} className={control()}>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
            <option value="">Any</option>
          </select>
        </div>
        <label className="flex items-end gap-2 pb-2 text-[15px] font-semibold">
          <input type="checkbox" checked={low} onChange={(e) => setLow(e.target.checked)} className="size-4 accent-leaf-800" />
          Only low or out
        </label>
      </div>

      <div className="grid gap-6 2xl:grid-cols-[1fr_440px]">
        <div>
          {error ? (
            <Alert>{error.error}</Alert>
          ) : !data ? (
            <Loading />
          ) : (
            <Table head={["Item", "Free to sell", "On hand", "Held", "Alert at", ""]} empty={data.items.length === 0 && "Nothing matches."}>
              {data.items.map((s) => (
                <tr key={s.id} className={s.id === selected ? "bg-leaf-50" : "hover:bg-leaf-50"}>
                  <td className={td}>
                    <button type="button" onClick={() => setSelected(s.id)} className="text-left font-semibold text-leaf-800 hover:underline">
                      {s.name}
                    </button>
                    <p className="text-[13px] text-ink-mute">
                      {s.kind === "packaging" ? s.refId : "Product"}
                      {s.status === "archived" && " · archived"}
                    </p>
                  </td>
                  <td className={`${td} tabular font-semibold`}>
                    {formatQty(s.available, s.unit)}{" "}
                    <span className="ml-1">
                      <Pill tone={LEVEL[s.level].tone}>{LEVEL[s.level].label}</Pill>
                    </span>
                  </td>
                  <td className={`${td} tabular`}>{formatQty(s.onHand, s.unit)}</td>
                  <td className={`${td} tabular text-ink-soft`}>{formatQty(s.reserved, s.unit)}</td>
                  <td className={`${td} tabular text-ink-soft`}>{formatQty(s.lowStockThreshold, s.unit)}</td>
                  <td className={`${td} text-right`}>
                    <Button kind="ghost" onClick={() => setSelected(s.id)}>
                      Manage
                    </Button>
                  </td>
                </tr>
              ))}
            </Table>
          )}
        </div>
        {item && <StockPanel key={item.id} item={item} onChange={reload} onClose={() => setSelected(null)} />}
      </div>
    </>
  );
}

function StockPanel({ item, onChange, onClose }: { item: StockItem; onChange: () => void; onClose: () => void }) {
  const [tab, setTab] = useState<"receive" | "adjust" | "settings">("receive");
  const movements = useLoad<{ items: StockMovement[]; nextCursor: string | null }>(`/admin/stock/${item.id}/movements?limit=30`);
  const changed = () => {
    onChange();
    movements.reload();
  };
  const unitHint = item.unit === "g" ? "In grams (1 kg = 1000)." : `In ${item.unit}.`;

  return (
    <Card title={item.name} actions={<Button kind="ghost" onClick={onClose}>Close</Button>} className="h-fit 2xl:sticky 2xl:top-24">
      <div role="tablist" aria-label="Stock actions" className="mb-4 flex gap-1 rounded-lg bg-leaf-50 p-1">
        {(["receive", "adjust", "settings"] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`h-9 flex-1 rounded-md text-[15px] font-semibold ${tab === t ? "bg-white text-leaf-900 shadow-sm" : "text-ink-soft"}`}
          >
            {{ receive: "Receive", adjust: "Adjust", settings: "Settings" }[t]}
          </button>
        ))}
      </div>
      <FieldScope id={`stock-${tab}`}>
        {tab === "receive" && <Receive item={item} hint={unitHint} onDone={changed} />}
        {tab === "adjust" && <Adjust item={item} hint={unitHint} onDone={changed} />}
        {tab === "settings" && <Settings item={item} hint={unitHint} onDone={changed} />}
      </FieldScope>

      <h3 className="mt-6 border-t border-line pt-4 text-sm font-semibold uppercase tracking-[0.06em] text-ink-mute">Recent movements</h3>
      {movements.error ? (
        <Alert>{movements.error.error}</Alert>
      ) : !movements.data ? (
        <Loading />
      ) : movements.data.items.length === 0 ? (
        <p className="mt-2 text-[15px] text-ink-soft">No movements yet.</p>
      ) : (
        <ul className="mt-2 divide-y divide-line text-[15px]">
          {movements.data.items.map((m) => (
            <li key={m.id} className="flex justify-between gap-3 py-2">
              <span className="min-w-0">
                <span className="block font-semibold capitalize">{m.reason.replace(/_/g, " ")}</span>
                <span className="block truncate text-[13px] text-ink-mute">
                  {formatDateTime(m.at)}
                  {m.note && ` · ${m.note}`}
                  {m.refId && !m.note && ` · ${m.refId}`}
                </span>
              </span>
              <span className="tabular shrink-0 text-right">
                {m.onHandDelta !== 0 && (
                  <span className={`block font-semibold ${m.onHandDelta > 0 ? "text-leaf-800" : "text-chilli-700"}`}>
                    {m.onHandDelta > 0 ? "+" : "−"}
                    {formatQty(Math.abs(m.onHandDelta), item.unit)}
                  </span>
                )}
                {m.reservedDelta !== 0 && (
                  <span className="block text-[13px] text-ink-mute">
                    held {m.reservedDelta > 0 ? "+" : "−"}
                    {formatQty(Math.abs(m.reservedDelta), item.unit)}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function Receive({ item, hint, onDone }: { item: StockItem; hint: string; onDone: () => void }) {
  const [quantity, setQuantity] = useState("");
  const [note, setNote] = useState("");
  const [ok, setOk] = useState<string | null>(null);
  const action = useAction();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setOk(null);
    const res = await action.run(() =>
      api(`/admin/stock/${item.id}/receive`, { method: "POST", body: { quantity: Number(quantity), ...(note.trim() && { note: note.trim() }) } }),
    );
    if (res) {
      setOk(`Added ${formatQty(Number(quantity), item.unit)}.`);
      setQuantity("");
      setNote("");
      onDone();
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-3">
      <p className="text-[15px] text-ink-soft">A fresh batch arrived or was ground.</p>
      <Field label="Quantity received" name="quantity" errors={action.fields} hint={hint}>
        {(p) => <input {...p} inputMode="numeric" value={quantity} onChange={(e) => setQuantity(e.target.value)} />}
      </Field>
      <Field label="Note (optional)" name="note" errors={action.fields} hint="Batch, supplier…">
        {(p) => <input {...p} value={note} onChange={(e) => setNote(e.target.value)} />}
      </Field>
      {action.error && <Alert>{action.error}</Alert>}
      {ok && <Alert kind="ok">{ok}</Alert>}
      <Button type="submit" busy={action.busy}>
        Receive stock
      </Button>
    </form>
  );
}

function Adjust({ item, hint, onDone }: { item: StockItem; hint: string; onDone: () => void }) {
  const [direction, setDirection] = useState<"remove" | "add">("remove");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState<"adjust" | "damage" | "return">("adjust");
  const [note, setNote] = useState("");
  const [ok, setOk] = useState<string | null>(null);
  const action = useAction();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setOk(null);
    const n = Number(quantity);
    if (!Number.isInteger(n) || n <= 0) return action.fail("Please check the highlighted fields.", { delta: "Enter a whole number above 0." });
    const res = await action.run(() =>
      api(`/admin/stock/${item.id}/adjust`, { method: "POST", body: { delta: direction === "remove" ? -n : n, reason, note } }),
    );
    if (res) {
      setOk("Saved.");
      setQuantity("");
      setNote("");
      onDone();
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-3">
      <p className="text-[15px] text-ink-soft">Correct a count, write off spoilage, or put a return back on the shelf.</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="adj-dir" className="mb-1 block text-sm font-semibold">
            Change
          </label>
          <select id="adj-dir" value={direction} onChange={(e) => setDirection(e.target.value as "remove" | "add")} className={control()}>
            <option value="remove">Remove</option>
            <option value="add">Add</option>
          </select>
        </div>
        <Field label="Quantity" name="delta" errors={action.fields} hint={hint}>
          {(p) => <input {...p} inputMode="numeric" value={quantity} onChange={(e) => setQuantity(e.target.value)} />}
        </Field>
      </div>
      <Field label="Reason" name="reason" errors={action.fields}>
        {(p) => (
          <select {...p} value={reason} onChange={(e) => setReason(e.target.value as typeof reason)}>
            <option value="adjust">Count correction</option>
            <option value="damage">Damaged or spoiled</option>
            <option value="return">Customer return</option>
          </select>
        )}
      </Field>
      <Field label="Why" name="note" errors={action.fields}>
        {(p) => <input {...p} value={note} onChange={(e) => setNote(e.target.value)} />}
      </Field>
      {action.error && <Alert>{action.error}</Alert>}
      {ok && <Alert kind="ok">{ok}</Alert>}
      <Button type="submit" busy={action.busy}>
        Save adjustment
      </Button>
    </form>
  );
}

function Settings({ item, hint, onDone }: { item: StockItem; hint: string; onDone: () => void }) {
  const [threshold, setThreshold] = useState(String(item.lowStockThreshold));
  const [name, setName] = useState(item.name);
  const [status, setStatus] = useState(item.status);
  const [ok, setOk] = useState(false);
  const action = useAction();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setOk(false);
    const res = await action.run(() =>
      api(`/admin/stock/${item.id}`, {
        method: "PATCH",
        body: { version: item.version, lowStockThreshold: Number(threshold), name, status },
      }),
    );
    if (res) {
      setOk(true);
      onDone();
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-3">
      <Field label="Name" name="name" errors={action.fields}>
        {(p) => <input {...p} value={name} onChange={(e) => setName(e.target.value)} />}
      </Field>
      <Field label="Warn when free stock falls to" name="lowStockThreshold" errors={action.fields} hint={hint}>
        {(p) => <input {...p} inputMode="numeric" value={threshold} onChange={(e) => setThreshold(e.target.value)} />}
      </Field>
      <Field label="Status" name="status" errors={action.fields}>
        {(p) => (
          <select {...p} value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
        )}
      </Field>
      {action.error && <Alert>{action.error}</Alert>}
      {ok && <Alert kind="ok">Saved.</Alert>}
      <Button type="submit" busy={action.busy}>
        Save settings
      </Button>
    </form>
  );
}

function NewPackaging({ onDone }: { onDone: () => void }) {
  const [v, setV] = useState({ code: "", name: "", lowStockThreshold: "50" });
  const action = useAction();
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => setV((s) => ({ ...s, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await action.run(() =>
      api("/admin/stock", {
        method: "POST",
        body: { code: v.code.toUpperCase(), name: v.name, lowStockThreshold: Number(v.lowStockThreshold) || 0 },
      }),
    );
    if (res) onDone();
  }

  return (
    <Card title="New packaging item">
      <FieldScope id="packaging">
        <form onSubmit={submit} noValidate className="grid gap-3 sm:grid-cols-4">
          <Field label="Code" name="code" errors={action.fields} hint="e.g. JAR-1KG">
            {(p) => <input {...p} value={v.code} onChange={set("code")} className={`${p.className} uppercase`} />}
          </Field>
          <Field label="Name" name="name" errors={action.fields} className="sm:col-span-2">
            {(p) => <input {...p} value={v.name} onChange={set("name")} />}
          </Field>
          <Field label="Warn at (pieces)" name="lowStockThreshold" errors={action.fields}>
            {(p) => <input {...p} inputMode="numeric" value={v.lowStockThreshold} onChange={set("lowStockThreshold")} />}
          </Field>
          <div className="space-y-2 sm:col-span-4">
            {action.error && <Alert>{action.error}</Alert>}
            <Button type="submit" busy={action.busy}>
              Add packaging item
            </Button>
          </div>
        </form>
      </FieldScope>
    </Card>
  );
}
