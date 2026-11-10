import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/auth/AccountFlows";
import { AuthShell } from "@/components/auth/AuthShell";

export const metadata: Metadata = {
  title: "Choose a new password",
  description: "Choose a new password for your Tej Organics account.",
  robots: { index: false },
};

export default function Page() {
  return (
    <AuthShell>
      <ResetPasswordForm />
    </AuthShell>
  );
}
