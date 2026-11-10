import type { Metadata } from "next";
import { VerifyEmail } from "@/components/auth/AccountFlows";
import { AuthShell } from "@/components/auth/AuthShell";

export const metadata: Metadata = {
  title: "Confirm your email",
  description: "Confirm the email address on your Tej Organics account.",
  robots: { index: false },
};

export default function Page() {
  return (
    <AuthShell>
      <VerifyEmail />
    </AuthShell>
  );
}
