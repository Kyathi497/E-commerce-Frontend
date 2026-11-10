import type { Metadata } from "next";
import { MapPin, Phone } from "lucide-react";
import { STORE } from "@/lib/catalog";
import { WhatsAppIcon } from "@/components/icons";

export const metadata: Metadata = {
  title: "Contact",
  description: "Orders and enquiries: WhatsApp or call 9603559603.",
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 pt-10 sm:px-6 lg:pt-16">
      <h1 className="font-display text-5xl font-extrabold tracking-[-0.03em] text-leaf-900">Orders and enquiries</h1>
      <p className="mt-4 max-w-[56ch] text-lg text-ink-soft">
        Questions about a product, a bulk order or a delivery? Message or call us. Thank you for supporting Tej Organics.
      </p>

      <div className="mt-10 grid gap-5 sm:grid-cols-2">
        <a
          href={`https://wa.me/${STORE.whatsapp}`}
          className="group flex flex-col rounded-[24px] bg-leaf-800 p-7 text-white transition-colors hover:bg-leaf-900"
        >
          <WhatsAppIcon className="size-8 text-turmeric-300" />
          <span className="mt-6 text-leaf-100">WhatsApp</span>
          <span className="tabular font-display text-3xl font-bold">{STORE.phone}</span>
          <span className="mt-3 font-semibold text-turmeric-300 group-hover:underline">Start a chat</span>
        </a>
        <a
          href={`tel:+91${STORE.phone}`}
          className="group flex flex-col rounded-[24px] bg-turmeric-100 p-7 text-leaf-950 transition-colors hover:bg-turmeric-300"
        >
          <Phone className="size-8 text-leaf-800" aria-hidden />
          <span className="mt-6 text-ink-soft">Call us</span>
          <span className="tabular font-display text-3xl font-bold">+91 {STORE.phone}</span>
          <span className="mt-3 font-semibold text-leaf-800 group-hover:underline">Tap to call</span>
        </a>
      </div>

      <div className="mt-10 flex gap-4 rounded-[24px] border border-line p-7">
        <MapPin className="mt-1 size-6 shrink-0 text-leaf-700" aria-hidden />
        <div>
          <h2 className="font-display text-xl font-bold text-leaf-900">Registered address</h2>
          <p className="mt-1 text-ink-soft">{STORE.address}</p>
        </div>
      </div>
    </div>
  );
}
