const ADMIN_TOKEN_KEY = 'relaydesk_admin_token';
const ADMIN_HEADER = 'x-relaydesk-admin-token';

export function getAdminToken(): string {
  try {
    return window.sessionStorage.getItem(ADMIN_TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

export function setAdminToken(token: string): void {
  try {
    window.sessionStorage.setItem(ADMIN_TOKEN_KEY, token.trim());
  } catch {
    // storage unavailable; token is simply not remembered
  }
}

export function clearAdminToken(): void {
  try {
    window.sessionStorage.removeItem(ADMIN_TOKEN_KEY);
  } catch {
    // ignore
  }
}

/**
 * The hardened API only returns full client configs, saves edits, and exports
 * the project when the request carries the admin token. Instead of touching
 * every component's fetch call, attach the token once to same-origin /api/
 * requests made by the studio.
 */
export function installAdminFetch(): void {
  if (typeof window === 'undefined') return;
  const originalFetch = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const token = getAdminToken();
    if (!token) return originalFetch(input, init);

    const rawUrl =
      typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    let isSameOriginApi = false;
    try {
      const url = new URL(rawUrl, window.location.origin);
      isSameOriginApi = url.origin === window.location.origin && url.pathname.startsWith('/api/');
    } catch {
      isSameOriginApi = false;
    }
    if (!isSameOriginApi) return originalFetch(input, init);

    const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
    if (!headers.has(ADMIN_HEADER)) headers.set(ADMIN_HEADER, token);
    return originalFetch(input, { ...init, headers });
  };
}

/** Returns true when the token unlocks the full (admin) client list. */
export async function verifyAdminToken(token: string): Promise<boolean> {
  try {
    const res = await fetch('/api/clients', {
      headers: { [ADMIN_HEADER]: token.trim() },
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { clients?: Array<{ faqs?: unknown }> };
    return Array.isArray(data.clients?.[0]?.faqs);
  } catch {
    return false;
  }
}
