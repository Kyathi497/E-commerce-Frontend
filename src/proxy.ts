import { type NextRequest, NextResponse } from "next/server";

// auth-service's access cookie (httpOnly, 15 minutes).
const ACCESS_COOKIE = "tej_at";

// Reads the role claim without checking the signature: this only decides
// which page to show. The gateway and every service verify the token on
// each API call, so a forged cookie gets an admin page with no data.
function roleOf(token: string) {
  try {
    const payload = token.split(".")[1] ?? "";
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return (JSON.parse(json) as { role?: string }).role;
  } catch {
    return undefined;
  }
}

// Signed-in shoppers are sent back to the store before /admin loads. With no
// access cookie (expired or logged out) the page loads, renews the session
// and shows the login or "no access" screen itself.
export function proxy(request: NextRequest) {
  const token = request.cookies.get(ACCESS_COOKIE)?.value;
  if (token && roleOf(token) === "user") return NextResponse.redirect(new URL("/", request.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
