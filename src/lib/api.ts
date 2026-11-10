// Browser-side client for the backend (/api/v1, proxied to the gateway).
// Tokens live in httpOnly cookies, so nothing here ever sees them. When the
// 15-minute access token runs out, a call gets 401: we refresh once (shared
// by every call waiting at that moment) and retry.

export interface ApiError {
  error: string;
  code?: string;
  fields?: Record<string, string>;
  requestId?: string;
}

export type ApiResult<T> = { ok: true; status: number; data: T } | { ok: false; status: number; error: ApiError };

const NETWORK_ERROR: ApiError = {
  error: "We couldn't reach the server. Check your connection and try again.",
  code: "NETWORK",
};

// Auth calls that must never trigger a refresh-and-retry themselves.
const NO_REFRESH = ["/auth/login", "/auth/register", "/auth/google", "/auth/refresh", "/auth/logout", "/auth/password/"];

let refreshing: Promise<boolean> | null = null;

// True when the session was renewed (or another tab just renewed it).
export function refreshSession() {
  refreshing ??= fetch("/api/v1/auth/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
    cache: "no-store",
  })
    .then(async (r) => {
      if (r.status === 409) {
        // Another request rotated the token a moment ago; its cookies land shortly.
        await new Promise((resolve) => setTimeout(resolve, 300));
        return true;
      }
      return r.ok;
    })
    .catch(() => false)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

async function send(path: string, init: RequestInit, json = true) {
  return fetch(`/api/v1${path}`, {
    ...init,
    cache: "no-store",
    // Every write is JSON: the backend rejects anything else (CSRF defence).
    // The one exception is the admin photo upload, which sets its own type.
    headers: json ? { "Content-Type": "application/json", ...init.headers } : init.headers,
  });
}

// Sends once, and again after renewing the session if the token had run out.
async function sendWithRefresh(path: string, request: RequestInit, json = true) {
  let res = await send(path, request, json);
  if (res.status === 401 && !NO_REFRESH.some((p) => path.startsWith(p)) && (await refreshSession())) {
    res = await send(path, request, json);
  }
  return res;
}

async function answer<T>(res: Response): Promise<ApiResult<T>> {
  const data = await res.json().catch(() => null);
  if (res.ok) return { ok: true, status: res.status, data: data as T };
  return { ok: false, status: res.status, error: (data as ApiError | null) ?? { error: "Something went wrong. Please try again." } };
}

// multipart/form-data (admin product photos). The browser sets the boundary.
export async function upload<T>(path: string, form: FormData): Promise<ApiResult<T>> {
  try {
    return await answer<T>(await sendWithRefresh(path, { method: "POST", body: form }, false));
  } catch {
    return { ok: false, status: 0, error: NETWORK_ERROR };
  }
}

// Fetches a file (CSV exports) and hands it to the browser to save.
export async function download(path: string, filename: string): Promise<ApiResult<null>> {
  try {
    const res = await sendWithRefresh(path, { method: "GET" });
    if (!res.ok) return answer<null>(res);
    const url = URL.createObjectURL(await res.blob());
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    return { ok: true, status: res.status, data: null };
  } catch {
    return { ok: false, status: 0, error: NETWORK_ERROR };
  }
}

export async function api<T>(
  path: string,
  init: { method?: string; body?: unknown; headers?: Record<string, string> } = {},
): Promise<ApiResult<T>> {
  const request: RequestInit = {
    method: init.method ?? "GET",
    headers: init.headers,
    body: init.body === undefined ? (init.method && init.method !== "GET" ? "{}" : undefined) : JSON.stringify(init.body),
  };
  try {
    return await answer<T>(await sendWithRefresh(path, request));
  } catch {
    return { ok: false, status: 0, error: NETWORK_ERROR };
  }
}
