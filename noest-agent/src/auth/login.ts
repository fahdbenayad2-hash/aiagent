import { chromium, Page } from "playwright";
import path from "path";
import fs from "fs";

const BASE_URL = "https://app.noest-dz.com";

export async function login(page: Page): Promise<void> {
  const email = process.env.NOEST_EMAIL;
  const password = process.env.NOEST_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "Missing credentials: NOEST_EMAIL and NOEST_PASSWORD must be set"
    );
  }

  // Step 1: API login to get authenticated cookies (bypasses browser block)
  let cookieStr = "";
  try {
    const r1 = await fetch(BASE_URL + "/login", {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });
    const h1 = await r1.text();
    const csrf = h1.match(
      /<input[^>]*name="_token"[^>]*value="([^"]+)"/
    )?.[1];
    if (!csrf) throw new Error("CSRF token not found");

    const sc1 = r1.headers.get("set-cookie") || "";
    const cookies: Record<string, string> = {};
    sc1.split(/,(?=\s*\w+=)/).forEach((c) => {
      const m = c.match(/^\s*([^=]+)=([^;]+)/);
      if (m) cookies[m[1].trim()] = m[2];
    });

    const ck = Object.entries(cookies)
      .map(([k, v]) => `${k}=${v}`)
      .join("; ");

    const r2 = await fetch(BASE_URL + "/login", {
      method: "POST",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: ck,
        Origin: BASE_URL,
        Referer: BASE_URL + "/login",
      },
      body: new URLSearchParams({
        _token: csrf,
        email,
        password,
      }),
      redirect: "manual",
    });

    const sc2 = r2.headers.get("set-cookie") || "";
    sc2.split(/,(?=\s*\w+=)/).forEach((c) => {
      const m = c.match(/^\s*([^=]+)=([^;]+)/);
      if (m) cookies[m[1].trim()] = m[2];
    });

    cookieStr = Object.entries(cookies)
      .map(([k, v]) => `${k}=${v}`)
      .join("; ");
  } catch (err) {
    throw new Error(
      `Login failed: API pre-login error — ${err instanceof Error ? err.message : err}`
    );
  }

  // Step 2: Set the authenticated cookies in the browser
  if (cookieStr) {
    const parsed = cookieStr.split("; ").map((pair) => {
      const [name, ...rest] = pair.split("=");
      return { name, value: rest.join("="), domain: "app.noest-dz.com", path: "/" };
    });
    await page.context().addCookies(parsed);
  }

  // Step 3: Navigate directly to dashboard with the authenticated session
  const response = await page.goto(BASE_URL + "/home", {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  await page.waitForTimeout(3000);

  // Verify login succeeded
  const pageTitle = await page.title();
  const pageUrl = page.url();
  const hasLinks = await page.locator("a").first().isVisible().catch(() => false);

  if (!hasLinks || pageTitle.includes("403") || pageTitle.includes("Login")) {
    await captureError(page, "login-cookie-failed");
    throw new Error(
      `Login failed: dashboard returned "${pageTitle}" at ${pageUrl} — session cookie may be invalid or blocked`
    );
  }
}

async function captureError(page: Page, label: string): Promise<void> {
  const dir = path.resolve("output");
  fs.mkdirSync(dir, { recursive: true });
  await page.screenshot({
    path: path.join(dir, `error-${label}-${Date.now()}.png`),
    fullPage: true,
  });
}
