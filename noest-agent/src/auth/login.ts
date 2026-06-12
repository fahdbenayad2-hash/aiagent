const BASE_URL = "https://app.noest-dz.com";

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

  try {
    // GET login page for CSRF token + initial cookies
    const r1 = await fetch(BASE_URL + "/login", {
      headers: { "User-Agent": ua },
    });
    const html = await r1.text();
    const csrf = html.match(
      /<meta[^>]*name="csrf-token"[^>]*content="([^"]+)"/
    )?.[1];
    if (!csrf) throw new Error("CSRF token not found in login page");

    const cookies = new Map<string, string>();
    for (const c of r1.headers.getSetCookie?.() ?? []) {
      const m = c.match(/^\s*([^=]+)=([^;]+)/);
      if (m) cookies.set(m[1].trim(), m[2]);
    }

    const ck = Array.from(cookies)
      .map(([k, v]) => `${k}=${v}`)
      .join("; ");

    // POST login credentials
    const r2 = await fetch(BASE_URL + "/login", {
      method: "POST",
      headers: {
        "User-Agent": ua,
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: ck,
        Origin: BASE_URL,
        Referer: BASE_URL + "/login",
      },
      body: new URLSearchParams({ _token: csrf, email, password }),
      redirect: "manual",
    });

    if (r2.status !== 302) {
      throw new Error(`Login POST returned ${r2.status}, expected 302`);
    }

    // Update cookies from the POST response (refreshed session)
    for (const c of r2.headers.getSetCookie?.() ?? []) {
      const m = c.match(/^\s*([^=]+)=([^;]+)/);
      if (m) cookies.set(m[1].trim(), m[2]);
    }

    const cookieString = Array.from(cookies)
      .map(([k, v]) => `${k}=${v}`)
      .join("; ");

    return cookieString;
  } catch (err) {
    throw new Error(
      `Login failed: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}
