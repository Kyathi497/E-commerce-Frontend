"use client";

import { useEffect, useRef, useState } from "react";
import { CookingPot, Package, ReceiptText, Truck } from "lucide-react";
import { formatINR, STORE } from "@/lib/catalog";

const STAGES = [
  { icon: ReceiptText, title: "You place the order", body: "Nothing is sitting ready on a shelf. Your order is the start." },
  { icon: CookingPot, title: "We prepare it fresh", body: "Your powders, paste, honey or ghee are made for your order." },
  { icon: Package, title: "Packed with care", body: "Sealed in glass jars under jute-cloth lids, hygienically packed." },
  { icon: Truck, title: "Sent straight to you", body: `Shipped from ${STORE.city} to your door. Flat ${formatINR(STORE.shippingFlat)} shipping.` },
];

export function StageStrip() {
  const ref = useRef<HTMLOListElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <ol ref={ref} data-inview={inView} className="stage-strip relative grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
      <span
        aria-hidden
        className="stage-line absolute left-[12.5%] right-[12.5%] top-7 hidden h-0.5 bg-[repeating-linear-gradient(90deg,var(--color-leaf-500)_0_10px,transparent_10px_18px)] lg:block"
      />
      {STAGES.map((s, i) => (
        <li
          key={s.title}
          className="stage relative flex gap-4 lg:flex-col lg:items-center lg:text-center"
          style={{ "--i": i } as React.CSSProperties}
        >
          <span className="relative grid size-14 shrink-0 place-items-center rounded-full bg-leaf-800 text-turmeric-300 ring-8 ring-leaf-50">
            <s.icon className="size-6" strokeWidth={1.8} aria-hidden />
          </span>
          <div>
            <h3 className="font-display text-lg font-bold text-leaf-950 lg:mt-4">{s.title}</h3>
            <p className="mt-1 max-w-[30ch] text-[15px] leading-snug text-ink-soft">{s.body}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
