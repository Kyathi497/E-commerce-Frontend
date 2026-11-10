import { createHmac, timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { CATALOG_TAG } from "@/lib/catalog-data";

// catalog-service's event relay calls this after every catalog change
// (product, size, price, photo, combo, category), so pages show the change
// within seconds (§6.3, §15.3). It sends a short-lived service token signed
// with the SERVICE_TOKEN_SECRET all services share, addressed to "frontend".

const DEV_SECRET = "dev-only-service-token-secret-change-me-in-production";
const ISSUER = "tej-service";
const AUDIENCE = "frontend";

function secret() {
  const s = process.env.SERVICE_TOKEN_SECRET;
  if (s) return s;
  return process.env.NODE_ENV === "production" ? null : DEV_SECRET;
}

const json = (part: string) => JSON.parse(Buffer.from(part, "base64url").toString()) as Record<string, unknown>;

// HS256 JWT check: signature, issuer, audience, expiry.
export function verifyServiceToken(token: string, key: string): string | null {
  try {
    const [header, payload, signature] = token.split(".");
    if (!header || !payload || !signature || json(header).alg !== "HS256") return null;
    const expected = createHmac("sha256", key).update(`${header}.${payload}`).digest();
    const given = Buffer.from(signature, "base64url");
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
    const claims = json(payload);
    const aud = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
    const now = Math.floor(Date.now() / 1000);
    if (claims.iss !== ISSUER || !aud.includes(AUDIENCE) || typeof claims.exp !== "number" || claims.exp < now - 30) return null;
    return typeof claims.sub === "string" ? claims.sub : null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const key = secret();
  if (!key) {
    console.error("revalidate: SERVICE_TOKEN_SECRET is not set");
    return Response.json({ error: "Not configured.", code: "UNAVAILABLE" }, { status: 503 });
  }
  const auth = request.headers.get("authorization") ?? "";
  const caller = auth.startsWith("Bearer ") ? verifyServiceToken(auth.slice(7).trim(), key) : null;
  if (!caller) return Response.json({ error: "Please log in to continue.", code: "UNAUTHENTICATED" }, { status: 401 });

  const event = (await request.json().catch(() => null)) as { id?: string; type?: string } | null;
  // Every catalog event changes what pages show; the next visit refetches.
  revalidateTag(CATALOG_TAG, { expire: 0 });
  console.info("catalog revalidated", { caller, event: event?.type, id: event?.id });
  return Response.json({ status: "processed" });
}
