import { Page } from "playwright";
import { NavbarSnapshot } from "../types.js";
import path from "path";
import fs from "fs";

function extractNumber(text: string | null): number {
  if (!text) return 0;
  const digits = text.replace(/\D/g, "");
  return digits ? parseInt(digits, 10) : 0;
}

async function captureError(page: Page, label: string): Promise<void> {
  const dir = path.resolve("output");
  fs.mkdirSync(dir, { recursive: true });
  await page.screenshot({
    path: path.join(dir, `error-${label}-${Date.now()}.png`),
    fullPage: true,
  });
}

async function readBadge(
  page: Page,
  itemName: string
): Promise<number> {
  const link = page
    .locator("a")
    .filter({ hasText: new RegExp(itemName, "i") })
    .first();
  try {
    await link.waitFor({ state: "attached", timeout: 10000 });
  } catch {
    await captureError(
      page,
      `badge-${itemName.replace(/\s+/g, "-")}-not-found`
    );
    throw new Error(`Navbar item not found: "${itemName}"`);
  }
  const text = await link.innerText();
  return extractNumber(text);
}

async function readSubBadge(
  page: Page,
  itemName: string
): Promise<number> {
  const item = page
    .locator("a")
    .filter({ hasText: new RegExp(itemName, "i") })
    .first();
  try {
    await item.waitFor({ state: "attached", timeout: 5000 });
    const text = await item.innerText();
    return extractNumber(text);
  } catch {
    await captureError(
      page,
      `subitem-${itemName.replace(/\s+/g, "-")}-not-found`
    );
    throw new Error(`Navbar sub-item not found: "${itemName}"`);
  }
}

export async function getNavbarSnapshot(
  page: Page
): Promise<NavbarSnapshot> {
  const colisPrets = await readBadge(page, "Colis prêts");
  const enTraitement = await readBadge(page, "En traitement");

  const versHub = await readSubBadge(page, "Vers Hub");
  const enHub = await readSubBadge(page, "En Hub");

  const enLivraison = await readBadge(page, "En livraison");
  const suspendus = await readBadge(page, "Suspendus");

  const chezStation = await readSubBadge(page, "Retours chez station");
  const chezHubCentral = await readSubBadge(page, "Retours chez hub central");
  const prepares = await readSubBadge(page, "Retours préparés");
  const enTransit = await readSubBadge(page, "Retours en transit");

  return {
    colisPrets,
    enTraitement,
    enExpedition: { versHub, enHub },
    enLivraison,
    suspendus,
    retours: { chezStation, chezHubCentral, prepares, enTransit },
  };
}
