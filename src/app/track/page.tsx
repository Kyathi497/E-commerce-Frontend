import type { Metadata } from "next";
import { TrackOrder } from "./TrackOrder";

export const metadata: Metadata = {
  title: "Track your order",
  description: "Check where your Tej Organics order is with your order number and mobile number.",
};

export default function TrackPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 pb-20 pt-10 sm:px-6 lg:pt-14">
      <h1 className="font-display text-4xl font-extrabold tracking-[-0.03em] text-leaf-900 sm:text-5xl">Track your order</h1>
      <p className="mt-3 max-w-[60ch] text-[17px] text-ink-soft">
        Enter the order number from your confirmation and the mobile number you ordered with.
      </p>
      <TrackOrder />
    </div>
  );
}
