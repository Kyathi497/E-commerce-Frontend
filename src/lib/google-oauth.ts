import "server-only";
import { cookies } from "next/headers";

// Google sign-in runs the OAuth code flow here (it needs the client secret),
// then hands Google's ID token to auth-service, which owns accounts and
// sessions. Nothing else about auth lives in the frontend.

export const GATEWAY_URL = process.env.GATEWAY_URL ?? "http://localhost:4000";

export const googleConfigured = () => Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

const OAUTH_COOKIE = "tej_oauth";

export function googleRedirectUri(request: Request) {
  return process.env.GOOGLE_REDIRECT_URI || `${new URL(request.url).origin}/api/auth/google/callback`;
}

// Only same-site paths are allowed as a post-login destination.
export function safeNext(next: unknown) {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\")
    ? next
    : "/";
}

// The OAuth `state` and where to go afterwards, kept for 10 minutes in an
// httpOnly cookie that only this site can set.
export async function saveOAuthState(state: string, next: string) {
  (await cookies()).set(OAUTH_COOKIE, JSON.stringify({ state, next }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api/auth/google",
    maxAge: 600,
  });
}

export async function takeOAuthState(): Promise<{ state: string; next: string } | null> {
  const store = await cookies();
  const raw = store.get(OAUTH_COOKIE)?.value;
  store.delete({ name: OAUTH_COOKIE, path: "/api/auth/google" });
  try {
    const saved = JSON.parse(raw ?? "") as { state?: unknown; next?: unknown };
    return typeof saved.state === "string" && saved.state ? { state: saved.state, next: safeNext(saved.next) } : null;
  } catch {
    return null;
  }
}
