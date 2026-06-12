import { chromium } from "playwright";
import { config } from "dotenv";
import path from "path";
import fs from "fs";
import { login } from "./auth/login.js";
import { getNavbarSnapshot } from "./collectors/navbarSnapshot.js";
import { sendTelegramMessage } from "./notify/telegram.js";
import { Snapshot } from "./types.js";

config();

function getDateString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

async function main(): Promise<void> {
  const browser = await chromium.launch({
    headless: true,
    args: [
      "--disable-blink-features=AutomationControlled",
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
    ],
  });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    locale: "fr-FR",
    timezoneId: "Africa/Algiers",
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
  });

  try {
    console.log("Logging in to Noest Express...");
    await login(page);
    console.log("Login successful.");

    console.log("Reading navbar counters...");
    const navbarCounts = await getNavbarSnapshot(page);

    const dateStr = getDateString();
    const snapshot: Snapshot = { date: dateStr, navbarCounts };

    const outputDir = path.resolve("output");
    fs.mkdirSync(outputDir, { recursive: true });
    const filePath = path.join(outputDir, `snapshot-${dateStr}.json`);
    fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2));

    console.log("\n=== Noest Dashboard Snapshot ===");
    console.log(`Date: ${dateStr}`);
    console.log(`  Colis prêts:       ${navbarCounts.colisPrets}`);
    console.log(`  En traitement:     ${navbarCounts.enTraitement}`);
    console.log(`  En expédition:`);
    console.log(`    Vers Hub:        ${navbarCounts.enExpedition.versHub}`);
    console.log(`    En Hub:          ${navbarCounts.enExpedition.enHub}`);
    console.log(`  En livraison:      ${navbarCounts.enLivraison}`);
    console.log(`  Suspendus:         ${navbarCounts.suspendus}`);
    console.log(`  Retours:`);
    console.log(`    Chez station:    ${navbarCounts.retours.chezStation}`);
    console.log(
      `    Chez hub central: ${navbarCounts.retours.chezHubCentral}`
    );
    console.log(`    Préparés:        ${navbarCounts.retours.prepares}`);
    console.log(`    En transit:      ${navbarCounts.retours.enTransit}`);
    console.log("================================");
    console.log(`Snapshot saved to ${filePath}`);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown error";
    console.error(`\nError: ${message}`);

    try {
      await sendTelegramMessage(
        `\u{1F534} Agent Noest — erreur: ${message}`
      );
    } catch (notifyErr) {
      console.error("Failed to send Telegram notification:", notifyErr);
    }

    process.exit(1);
  } finally {
    await browser.close();
  }
}

main();
