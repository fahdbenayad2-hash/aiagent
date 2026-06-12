import { Page } from "playwright";
import path from "path";
import fs from "fs";

const BASE_URL = "https://app.noest-dz.com";
const LOGIN_URL = "https://app.noest-dz.com/login";
const DASHBOARD_URL = "https://app.noest-dz.com/home";

export async function login(page: Page): Promise<void> {
  const email = process.env.NOEST_EMAIL;
  const password = process.env.NOEST_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "Missing credentials: NOEST_EMAIL and NOEST_PASSWORD must be set"
    );
  }

  // First visit the homepage to establish session/cookies
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(2000);

  // Click the login link instead of navigating directly
  const loginLink = page.getByRole("link", { name: "Corporate Login" });
  const loginLinkVisible = await loginLink.isVisible().catch(() => false);

  if (loginLinkVisible) {
    await loginLink.click();
    await page.waitForURL("**/login", { timeout: 10000 });
    await page.waitForTimeout(2000);
  } else {
    // Fallback: navigate directly
    await page.goto(LOGIN_URL, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(2000);
  }

  const emailField = page.locator("#email");
  const emailVisible = await emailField.isVisible().catch(() => false);

  if (!emailVisible) {
    await captureError(page, "login-page-blocked");
    const title = await page.title();
    const url = page.url();
    throw new Error(
      `Login page blocked (${title} at ${url}) — the site may be blocking the request`
    );
  }

  await emailField.fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: "Se connecter" }).click();

  try {
    await page.waitForURL("**/home", { timeout: 20000 });
  } catch {
    await captureError(page, "login-timeout");
    const url = page.url();
    throw new Error(
      `Login failed: redirected to "${url}" instead of /home`
    );
  }

  await page.waitForTimeout(3000);

  try {
    await page.waitForSelector("a", { timeout: 10000 });
  } catch {
    await captureError(page, "login-links-missing");
    throw new Error("Login failed: dashboard links not found after authentication");
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
