import { randomBytes } from "node:crypto";
import { googleConfigured, googleRedirectUri, safeNext, saveOAuthState } from "@/lib/google-oauth";

// Starts Google sign-in. Without GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET the
// login page offers a labelled simulation instead (dev only; auth-service
// refuses it in production).
export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = safeNext(url.searchParams.get("next"));

  if (!googleConfigured()) {
    const back = new URL("/login", url.origin);
    back.searchParams.set("google", "test");
    if (next !== "/") back.searchParams.set("next", next);
    return Response.redirect(back, 303);
  }

  const state = randomBytes(16).toString("base64url");
  await saveOAuthState(state, next);

  const auth = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  auth.search = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: googleRedirectUri(request),
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  }).toString();
  return Response.redirect(auth, 303);
}
