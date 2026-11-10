"use client";

import { useRef, useState } from "react";
import { Trash2, Upload } from "lucide-react";
import { api, upload } from "@/lib/api";
import { Alert, Button, Card, control, useAction } from "@/components/admin/ui";

// Photo list + upload form shared by the product and combo editors.
// basePath is the admin URL of the owner, e.g. /admin/products/<id>; the
// API replies with the updated owner under `field`.
export function PhotoManager<T>({
  basePath,
  field,
  images,
  empty,
  onChange,
}: {
  basePath: string;
  field: string;
  images: { id: string; alt: string; src: string; srcSet: string }[];
  empty: string;
  onChange: (owner: T) => void;
}) {
  const file = useRef<HTMLInputElement>(null);
  const [alt, setAlt] = useState("");
  const [removing, setRemoving] = useState<string | null>(null);
  const action = useAction();

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const chosen = file.current?.files?.[0];
    if (!chosen) return;
    const form = new FormData();
    form.append("file", chosen);
    if (alt.trim()) form.append("alt", alt.trim());
    const res = await action.run(() => upload<Record<string, T>>(`${basePath}/images`, form));
    if (res) {
      onChange(res[field]!);
      setAlt("");
      if (file.current) file.current.value = "";
    }
  }

  async function remove(imageId: string) {
    setRemoving(imageId);
    const res = await action.run(() => api<Record<string, T>>(`${basePath}/images/${imageId}`, { method: "DELETE" }));
    setRemoving(null);
    if (res) onChange(res[field]!);
  }

  return (
    <Card title="Photos">
      {images.length === 0 ? (
        <p className="text-[15px] text-ink-soft">{empty}</p>
      ) : (
        <ul className="grid grid-cols-3 gap-3">
          {images.map((img, i) => (
            <li key={img.id} className="group relative">
              {/* eslint-disable-next-line @next/next/no-img-element -- already resized to 400/800 px WebP by catalog-service */}
              <img src={img.src} srcSet={img.srcSet} sizes="160px" alt={img.alt} className="aspect-square w-full rounded-lg object-cover" />
              {i === 0 && <span className="absolute left-1.5 top-1.5 rounded bg-white/90 px-1.5 text-[12px] font-semibold">Main</span>}
              <button
                type="button"
                onClick={() => void remove(img.id)}
                disabled={removing !== null}
                aria-label={`Remove photo ${i + 1}`}
                className="absolute right-1.5 top-1.5 grid size-8 place-items-center rounded-full bg-white/90 text-chilli-700 hover:bg-white disabled:opacity-60"
              >
                <Trash2 className="size-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={send} className="mt-4 space-y-3 border-t border-line pt-4">
        <div>
          <label htmlFor="photo" className="mb-1 block text-sm font-semibold">
            Add a photo <span className="font-normal text-ink-mute">(JPEG, PNG or WebP, up to 5 MB)</span>
          </label>
          <input id="photo" ref={file} type="file" accept="image/jpeg,image/png,image/webp" className="block w-full text-[15px] file:mr-3 file:h-10 file:rounded-lg file:border-0 file:bg-leaf-100 file:px-4 file:font-semibold file:text-leaf-900" />
        </div>
        <div>
          <label htmlFor="photo-alt" className="mb-1 block text-sm font-semibold">
            Description for screen readers <span className="font-normal text-ink-mute">(optional)</span>
          </label>
          <input id="photo-alt" value={alt} onChange={(e) => setAlt(e.target.value)} maxLength={160} className={control()} />
        </div>
        {action.error && <Alert>{action.fields.file ?? action.error}</Alert>}
        <Button type="submit" kind="secondary" busy={action.busy && removing === null}>
          <Upload className="size-4" aria-hidden /> Upload
        </Button>
      </form>
    </Card>
  );
}
