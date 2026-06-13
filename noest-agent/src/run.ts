import { config } from "dotenv";
import path from "path";
import fs from "fs";
import { login, LoginResult } from "./auth/login.js";
import { getDashboardSnapshot } from "./collectors/dashboardSnapshot.js";
import { getSuspendedOrders } from "./collectors/suspendedOrders.js";
import { getNonEncaisseOrders } from "./collectors/nonEncaisseOrders.js";
import { getProductsStock, ProductsStockDetails } from "./collectors/productsStock.js";
import { getSuiviHistoryBatch } from "./collectors/suiviHistory.js";
import { sendTelegramMessage, sendDailyDigest } from "./notify/telegram.js";
import { getDb } from "./db/connection.js";
import { saveSnapshot } from "./db/repositories/snapshotRepo.js";
import { flattenSnapshot, computeDeltas } from "./analysis/deltas.js";
import { evaluateAlerts } from "./alerts/rules.js";
import { buildSuspendedDetails } from "./analysis/suspendedAnalysis.js";
import { analyzeSuspendedOrders, analyzeNonEncaisseOrders } from "./analysis/aiAnalysis.js";
import { Snapshot, SuspendedDetails, NonEncaisseDetails, AiAnalysis } from "./types.js";

config();

function getDateString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

async function main(): Promise<void> {
  try {
    // 1. Auth
    console.log("Logging in to Noest Express...");
    const { cookieString, csrfToken } = await login();
    console.log("Login successful.");

    // 2. Collect
    console.log("Reading dashboard data...");
    const { apiResponse, snapshot: dashboard } =
      await getDashboardSnapshot(cookieString, csrfToken);
    const dateStr = getDateString();
    dashboard.date = dateStr;
    console.log("Data collected.");

    // 3. Persist
    console.log("Persisting to SQLite...");
    const db = getDb();
    const flatMetrics = flattenSnapshot(dashboard);
    saveSnapshot(db, dateStr, apiResponse, flatMetrics);

    // 4. Analyse
    console.log("Computing deltas...");
    const deltas = computeDeltas(flatMetrics, db, dateStr);
    const alerts = evaluateAlerts(flatMetrics, deltas);

    // 4b. Phase 2 — Suspended orders + AI analysis
    let suspendedDetails: SuspendedDetails | null = null;
    let analyses: AiAnalysis[] = [];

    if (dashboard.problemes.suspendus > 0) {
      console.log("Fetching suspended orders...");
      const orders = await getSuspendedOrders(cookieString, csrfToken);
      if (orders.length > 0) {
        console.log(`Found ${orders.length} suspended orders. Fetching suivi history...`);
        const trackings = orders.map((o) => o.tracking);
        const suiviMap = await getSuiviHistoryBatch(cookieString, trackings, csrfToken);
        suspendedDetails = buildSuspendedDetails(orders, suiviMap);
        console.log(`Total blocked amount: ${suspendedDetails.totalAmount} DA`);

        console.log("Running AI analysis via Gemini...");
        analyses = await analyzeSuspendedOrders(orders, suiviMap);
        for (const a of analyses) {
          console.log(`  Risk: ${a.riskLevel} — ${a.summary.substring(0, 80)}`);
        }
      } else {
        console.log("No suspended order details retrieved.");
      }
    } else {
      console.log("No suspended orders to analyze.");
    }

    // 4c. Phase 2 — Non encaissé orders (livré non encaissé)
    let nonEncaisseDetails: NonEncaisseDetails | null = null;
    let nonEncaisseAnalysis: AiAnalysis | null = null;
    let stockDetails: ProductsStockDetails | null = null;

    if (dashboard.finance.livreNonEncaisse > 0) {
      console.log("Fetching non-encaisse orders...");
      const { orders, sumLivred } = await getNonEncaisseOrders(cookieString, csrfToken);
      if (orders.length > 0) {
        const totalAmount = orders.reduce((s, o) => s + o.montant, 0);
        nonEncaisseDetails = { orders, totalAmount, orderCount: orders.length, sumLivred };
        console.log(`Found ${orders.length} non-encaisse orders. Total: ${totalAmount} DA, Sum livred: ${sumLivred} DA`);

        console.log("Running AI analysis on non-encaisse orders...");
        nonEncaisseAnalysis = await analyzeNonEncaisseOrders(orders, totalAmount);
        if (nonEncaisseAnalysis) {
          console.log(`  Risk: ${nonEncaisseAnalysis.riskLevel} — ${nonEncaisseAnalysis.summary.substring(0, 80)}`);
        }
      } else {
        console.log("No non-encaisse order details retrieved.");
      }
    } else {
      console.log("No non-encaisse orders to analyze.");
    }

    // 4d. Phase 3 — Products / Stock
    console.log("Fetching products stock...");
    stockDetails = await getProductsStock(cookieString, csrfToken);
    console.log(`Found ${stockDetails.totalProducts} products. Stock dispo: ${stockDetails.totalStockDisponible} units.`);
    if (stockDetails.outOfStock.length > 0) {
      console.log(`  🔴 ${stockDetails.outOfStock.length} produit(s) épuisé(s)!`);
      for (const p of stockDetails.outOfStock.slice(0, 5)) {
        console.log(`     - ${p.title || p.reference}`);
      }
    }
    if (stockDetails.lowStock.length > 0) {
      console.log(`  🟡 ${stockDetails.lowStock.length} produit(s) stock bas (≤5).`);
    }

    // 5. Write JSON output
    const navbarCounts = {
      colisPrets: dashboard.pipeline.aPreparer,
      enTraitement: dashboard.pipeline.enTraitement,
      enExpedition: {
        versHub: dashboard.pipeline.versHub,
        enHub: dashboard.pipeline.enHub,
      },
      enLivraison: dashboard.pipeline.enLivraison,
      suspendus: dashboard.problemes.suspendus,
      retours: {
        chezStation: dashboard.retours.chezStation,
        chezHubCentral: dashboard.retours.chezHubCentral,
        prepares: dashboard.retours.recu,
        enTransit: dashboard.retours.enTransitStock,
      },
    };

    const snapshot: Snapshot = {
      date: dateStr,
      notificationsApi: apiResponse,
      navbarCounts,
      dashboard,
      flatMetrics,
      deltaVsYesterday: deltas.vsYesterday,
      deltaVs7dAvg: deltas.vs7dAvg,
      alerts,
      suspendedDetails,
      analyses,
      nonEncaisseDetails,
    };

    const outputDir = path.resolve("output");
    fs.mkdirSync(outputDir, { recursive: true });
    const filePath = path.join(outputDir, `snapshot-${dateStr}.json`);
    fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2));
    console.log(`Snapshot saved to ${filePath}`);

    // 6. Notify
    console.log("Sending daily digest...");
    await sendDailyDigest(dashboard, flatMetrics, deltas, alerts, suspendedDetails, analyses, nonEncaisseDetails, stockDetails);

    // 7. Console summary
    const d = dashboard;
    console.log("\n=== Noest Dashboard Snapshot ===");
    console.log(`Date: ${dateStr}`);
    console.log(`  Pipeline:`);
    console.log(`    À expédier:      ${d.pipeline.aExpedier}`);
    console.log(`    À préparer:      ${d.pipeline.aPreparer}`);
    console.log(`    En préparation:  ${d.pipeline.enPreparation}`);
    console.log(`    En ramassage:    ${d.pipeline.enRamassage}`);
    console.log(`    En traitement:   ${d.pipeline.enTraitement}`);
    console.log(`    Vers Hub:        ${d.pipeline.versHub}`);
    console.log(`    En Hub:          ${d.pipeline.enHub}`);
    console.log(`    En livraison:    ${d.pipeline.enLivraison}`);
    console.log(`  Problèmes:`);
    console.log(`    Suspendus:       ${d.problemes.suspendus}`);
    console.log(`    Désaccords:      ${d.problemes.desaccord}`);
    console.log(`  Retours:`);
    console.log(`    Chez station:    ${d.retours.chezStation}`);
    console.log(`    Hub central:     ${d.retours.chezHubCentral}`);
    console.log(`    Transit stock:   ${d.retours.enTransitStock}`);
    console.log(`    Reçus:           ${d.retours.recu}`);
    console.log(`  Finance:`);
    console.log(`    Livré non enc.:  ${d.finance.livreNonEncaisse}`);
    console.log(`    Livré encaissé:  ${d.finance.livreEncaisse}`);
    console.log(`    Recouvrements:   ${d.finance.recouvrements}`);
    console.log(`    Recouvrés:       ${d.finance.recouvres}`);
    console.log(`    Chèques encours: ${d.finance.chequeEncours}`);
    if (alerts.length > 0) {
      console.log(`  Alertes (${alerts.length}):`);
      for (const a of alerts) console.log(`    ${a}`);
    } else {
      console.log(`  Alertes: ✅ Tout est normal`);
    }
    if (suspendedDetails) {
      console.log(`  Suspendus:`);
      console.log(`    Commandes:     ${suspendedDetails.orderCount}`);
      console.log(`    Total bloqué:  ${suspendedDetails.totalAmount.toLocaleString()} DA`);
      if (analyses.length > 0) {
        console.log(`    Analyses IA:   ${analyses.length}`);
        for (const a of analyses) {
          console.log(`      [${a.riskLevel}] ${a.summary.substring(0, 100)}`);
        }
      }
    }
    if (nonEncaisseDetails) {
      console.log(`  Non encaissé:`);
      console.log(`    Commandes:     ${nonEncaisseDetails.orderCount}`);
      console.log(`    Total:         ${nonEncaisseDetails.totalAmount.toLocaleString()} DA`);
      console.log(`    Somme livrée:  ${nonEncaisseDetails.sumLivred.toLocaleString()} DA`);
      if (nonEncaisseAnalysis) {
        console.log(`    Analyse IA:    [${nonEncaisseAnalysis.riskLevel}] ${nonEncaisseAnalysis.summary.substring(0, 100)}`);
      }
    }
    console.log("================================");
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
  }
}

main();
