export interface LoginResult {
  cookieString: string;
  csrfToken: string;
}

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

function extractCsrf(html: string): string | undefined {
  return html.match(
    /<meta[^>]*name="csrf-token"[^>]*content="([^"]+)"/
  )?.[1];
}

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export async function login(): Promise<LoginResult> {
  const email = process.env.NOEST_EMAIL;
  const password = process.env.NOEST_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "Missing credentials: NOEST_EMAIL and NOEST_PASSWORD must be set in .env"
    );
  }

  console.log(`  Credentials: email="${email}" (${email.length} chars), password=${password ? password.length + " chars" : "MISSING"}`);

  const cookies = new Map<string, string>();

  async function req(url: string, init: RequestInit): Promise<Response> {
    const headers: Record<string, string> = {
      ...(init.headers as Record<string, string>),
      Cookie: cookiesToString(cookies),
    };
    const res = await fetch(url, { ...init, headers, redirect: "manual" });
    parseSetCookie(res.headers, cookies);
    return res;
  }

  // Step 1: GET /login
  console.log("  GET /login ...");
  let res = await req(BASE_URL + "/login", {
    method: "GET",
    headers: { "User-Agent": UA, Accept: "text/html" },
  });
  let body = await res.text();

  let redirectCount = 0;
  while (res.status >= 300 && res.status < 400 && res.headers.get("location") && redirectCount < 3) {
    const target = new URL(res.headers.get("location")!, BASE_URL).href;
    console.log(`  -> ${res.status} -> ${target}`);
    res = await req(target, {
      method: "GET",
      headers: { "User-Agent": UA, Accept: "text/html" },
    });
    body = await res.text();
    redirectCount++;
  }
  console.log(`  -> ${res.status}`);

  const formAction = body.match(/<form[^>]*method="POST"[^>]*action="([^"]*)"/i)?.[1] || "/login";
  const formFullAction = formAction.startsWith("http") ? formAction : BASE_URL + formAction;

  const csrfToken = extractCsrf(body);
  if (!csrfToken) throw new Error("CSRF token not found");

  // Step 2: POST login — try with JSON Accept to get exact validation errors
  console.log("\n  POST /login (with JSON Accept to get validation errors)...");
  const formBody = new URLSearchParams();
  formBody.set("_token", csrfToken);
  formBody.set("email", email);
  formBody.set("password", password);

  res = await req(formFullAction, {
    method: "POST",
    headers: {
      "User-Agent": UA,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
      Origin: BASE_URL,
      Referer: BASE_URL + "/login",
    },
    body: formBody,
  });
  const postLoc = res.headers.get("location") || "-";
  console.log(`  -> ${res.status}${postLoc !== "-" ? " Location: " + postLoc : ""}`);

  // Read response body (JSON for AJAX, HTML for redirect)
  let responseText = await res.text().catch(() => "");
  const contentType = res.headers.get("content-type") || "";

  if (contentType.includes("json")) {
    try {
      const json = JSON.parse(responseText);
      console.log(`  JSON response:`, JSON.stringify(json, null, 2).substring(0, 500));
    } catch {
      console.log(`  Raw response (first 500): ${responseText.substring(0, 500)}`);
    }
  } else if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
    // Follow redirect and check for errors
    const target = new URL(res.headers.get("location")!, BASE_URL).href;
    console.log(`  Following redirect to ${target} ...`);
    res = await req(target, {
      method: "GET",
      headers: { "User-Agent": UA, Accept: "text/html" },
    });
    if (res.ok) {
      body = await res.text();
      const isLoginPage = body.includes('name="email"') && body.includes('name="password"');
      if (isLoginPage) {
        console.log("  ⚠️ Still on login page — auth FAILED");
        // Print more context around errors
        const errorSection = body.match(/alert[^>]*alert-danger[^>]*>([\s\S]{0,500}?)(?:<\/div>|$)/i);
        if (errorSection) {
          console.log("  Error alert:", errorSection[1].replace(/<[^>]+>/g, " ").trim().substring(0, 300));
        }
        // Also look for invalid-feedback spans
        const feedbacks = [...body.matchAll(/invalid-feedback[^>]*>([\s\S]*?)<\/span>/gi)];
        for (const f of feedbacks) {
          console.log("  Invalid feedback:", f[1].replace(/<[^>]+>/g, " ").trim());
        }
        throw new Error("Login failed");
      }
    }
  } else if (!res.ok) {
    console.log(`  Response (first 800): ${responseText.substring(0, 800)}`);
    throw new Error(`Login failed with status ${res.status}`);
  }

  // We should only reach here if login succeeded (redirected away from /login)
  // Follow remaining redirects
  redirectCount = 0;
  while (res.status >= 300 && res.status < 400 && res.headers.get("location") && redirectCount < 5) {
    const target = new URL(res.headers.get("location")!, BASE_URL).href;
    console.log(`  Following redirect to ${target} ...`);
    res = await req(target, {
      method: "GET",
      headers: { "User-Agent": UA, Accept: "text/html" },
    });
    if (res.ok) body = await res.text();
    else body = "";
    redirectCount++;
  }

  if (!res.ok) {
    throw new Error(`Login failed: final status ${res.status}`);
  }

  // Warmup — always extract fresh CSRF from an authenticated page (post-login session)
  console.log("\n  Warmup GET /livraison/cashOut ...");
  res = await req(BASE_URL + "/livraison/cashOut", {
    method: "GET",
    headers: { "User-Agent": UA, Accept: "text/html" },
  });
  console.log(`  -> ${res.status} Location: ${res.headers.get("location") || "-"}`);
  if (res.ok) {
    const html3 = await res.text();
    let freshToken = extractCsrf(html3);
    if (!freshToken && cookies.has("XSRF-TOKEN")) {
      console.log("  Falling back to XSRF-TOKEN cookie as CSRF");
      freshToken = decodeURIComponent(cookies.get("XSRF-TOKEN")!);
    }
    if (!freshToken) {
      throw new Error("Could not extract CSRF token after login");
    }
    console.log(`  Login OK. CSRF: ${freshToken.substring(0, 20)}..., cookies: ${Array.from(cookies.keys()).join(", ")}`);
    return { cookieString: cookiesToString(cookies), csrfToken: freshToken };
  }

  throw new Error(`Warmup failed: ${res.status}`);
}
