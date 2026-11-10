import { GATEWAY_URL, googleRedirectUri, takeOAuthState } from "@/lib/google-oauth";

function fail(origin: string) {
  return Response.redirect(new URL("/login?error=google", origin), 303);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const saved = await takeOAuthState();

  const code = url.searchParams.get("code");
  if (!saved || !code || url.searchParams.get("state") !== saved.state) return fail(url.origin);

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: googleRedirectUri(request),
      grant_type: "authorization_code",
    }),
  });
  if (!tokenRes.ok) {
    console.error("Google token exchange failed", tokenRes.status, await tokenRes.text());
    return fail(url.origin);
  }
  const { id_token } = (await tokenRes.json()) as { id_token?: string };
  if (!id_token) return fail(url.origin);

  // auth-service verifies the ID token, finds or creates the account and
  // answers with the session cookies, which we pass on to the browser.
  const forwardedFor = request.headers.get("x-forwarded-for");
  const userAgent = request.headers.get("user-agent");
  const authRes = await fetch(`${GATEWAY_URL}/api/v1/auth/google`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(forwardedFor && { "X-Forwarded-For": forwardedFor }),
      ...(userAgent && { "User-Agent": userAgent }),
    },
    body: JSON.stringify({ idToken: id_token }),
    cache: "no-store",
  }).catch(() => null);
  if (!authRes?.ok) {
    console.error("auth-service Google login failed", authRes?.status, await authRes?.text().catch(() => ""));
    return fail(url.origin);
  }

  const headers = new Headers({ Location: new URL(saved.next, url.origin).toString() });
  for (const cookie of authRes.headers.getSetCookie()) headers.append("Set-Cookie", cookie);
  return new Response(null, { status: 303, headers });
}
