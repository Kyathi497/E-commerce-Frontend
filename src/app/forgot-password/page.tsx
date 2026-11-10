import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/AccountFlows";
import { AuthShell } from "@/components/auth/AuthShell";

export const metadata: Metadata = {
  title: "Forgot password",
  description: "Get a link to choose a new Tej Organics password.",
  robots: { index: false },
};

export default function Page() {
  return (
    <AuthShell>
      <ForgotPasswordForm />
    </AuthShell>
  );
}
