const BASE_URL = "https://app.noest-dz.com";

function parseSetCookie(
  headers: Headers,
  store: Map<string, string>
): void {
  for (const c of headers.getSetCookie?.() ?? []) {
    const m = c.match(/^\s*([^=]+)=([^;]+)/);
    if (m) store.set(m[1].trim(), m[2]);
  }
}

function cookiesToString(store: Map<string, string>): string {
  return Array.from(store)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
}

async function fetchCsrf(
  baseUrl: string,
  ua: string,
  cookies: Map<string, string>
): Promise<{ token: string; fromCookie: boolean }> {
  const urls = [
    baseUrl + "/login",
    baseUrl + "/",
    baseUrl + "/home",
    baseUrl + "/sanctum/csrf-cookie",
  ];

  for (const url of urls) {
    const res = await fetch(url, {
      headers: { "User-Agent": ua, Cookie: cookiesToString(cookies) },
      redirect: "follow",
    });
    parseSetCookie(res.headers, cookies);

    if (res.ok) {
      const html = await res.text();
      const token = html.match(
        /<meta[^>]*name="csrf-token"[^>]*content="([^"]+)"/
      )?.[1];
      if (token) return { token, fromCookie: false };
    }
  }

  // Fallback: use encrypted XSRF-TOKEN cookie as X-XSRF-TOKEN header
  if (cookies.has("XSRF-TOKEN")) {
    return { token: decodeURIComponent(cookies.get("XSRF-TOKEN")!), fromCookie: true };
  }

  const cookieNames = Array.from(cookies.keys()).join(", ");
  throw new Error(
    `CSRF token not found — tried ${urls.join(", ")} — cookies: ${cookieNames || "none"}`
  );
}

export async function login(): Promise<string> {
  const email = process.env.NOEST_EMAIL;
  const password = process.env.NOEST_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "Missing credentials: NOEST_EMAIL and NOEST_PASSWORD must be set"
    );
  }

  const ua =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

  const cookies = new Map<string, string>();

  const { token: csrf, fromCookie } = await fetchCsrf(BASE_URL, ua, cookies);

  // Build POST headers
  const headers: Record<string, string> = {
    "User-Agent": ua,
    "Content-Type": "application/x-www-form-urlencoded",
    Cookie: cookiesToString(cookies),
    Origin: BASE_URL,
    Referer: BASE_URL + "/login",
  };

  // Raw token from meta tag → _token body param
  // Encrypted token from XSRF-TOKEN cookie → X-XSRF-TOKEN header
  const body = new URLSearchParams({ email, password });
  if (fromCookie) {
    headers["X-XSRF-TOKEN"] = csrf;
  } else {
    body.set("_token", csrf);
  }

  const r2 = await fetch(BASE_URL + "/login", {
    method: "POST",
    headers,
    body,
    redirect: "manual",
  });

  if (r2.status !== 302) {
    const bodyText = await r2.text().catch(() => "");
    throw new Error(
      `Login POST returned ${r2.status} (expected 302) — ${bodyText.substring(0, 200)}`
    );
  }

  parseSetCookie(r2.headers, cookies);

  return cookiesToString(cookies);
}
