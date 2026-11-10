import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm, AuthFormFromURL } from "@/components/auth/AuthForm";
import { AuthShell } from "@/components/auth/AuthShell";

export const metadata: Metadata = {
  title: "Log in",
  description: "Log in to Tej Organics for quicker checkout with your saved delivery details.",
  robots: { index: false },
};

export default function LoginPage() {
  return (
    <AuthShell>
      <Suspense fallback={<AuthForm mode="login" />}>
        <AuthFormFromURL mode="login" />
      </Suspense>
    </AuthShell>
  );
}
