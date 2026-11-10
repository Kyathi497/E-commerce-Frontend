import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm, AuthFormFromURL } from "@/components/auth/AuthForm";
import { AuthShell } from "@/components/auth/AuthShell";

export const metadata: Metadata = {
  title: "Create an account",
  description: "Create a Tej Organics account and save your delivery details for quicker reorders.",
  robots: { index: false },
};

export default function RegisterPage() {
  return (
    <AuthShell>
      <Suspense fallback={<AuthForm mode="register" />}>
        <AuthFormFromURL mode="register" />
      </Suspense>
    </AuthShell>
  );
}
