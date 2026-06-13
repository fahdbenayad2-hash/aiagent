import { DashboardSnapshot, FlatMetrics, SuspendedDetails, NonEncaisseDetails, AiAnalysis } from "../types.js";
import { ProductsStockDetails } from "../collectors/productsStock.js";

const TG_TOKEN = () => process.env.TELEGRAM_BOT_TOKEN;
const TG_CHAT = () => process.env.TELEGRAM_CHAT_ID;

export async function sendTelegramMessage(text: string): Promise<void> {
  const token = TG_TOKEN();
  const chatId = TG_CHAT();

  if (!token || !chatId) {
    console.warn(
      "TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set — skipping notification"
    );
    return;
  }

  const res = await fetch(
    `https://api.telegram.org/bot${token}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
      }),
    }
  );

  if (!res.ok) {
    const body = await res.text();
    console.warn(`Telegram notification failed (${res.status}): ${body}`);
  }
}

function fmtDelta(
  value: number,
  delta: number | undefined,
  suffix = ""
): string {
  let s = String(value);
  if (delta !== undefined && delta !== 0) {
    const sign = delta > 0 ? "+" : "";
    s += ` (${sign}${delta}${suffix})`;
  }
  return s;
}

function fmtList(items: string[], indent = ""): string {
  return items.map((i) => `${indent}${i}`).join("\n");
}

export async function sendDailyDigest(
  snapshot: DashboardSnapshot,
  flatMetrics: FlatMetrics,
  deltas: { vsYesterday: FlatMetrics; vs7dAvg: FlatMetrics },
  alerts: string[],
  suspendedDetails?: SuspendedDetails | null,
  analyses?: AiAnalysis[],
  nonEncaisseDetails?: NonEncaisseDetails | null,
  stockDetails?: ProductsStockDetails | null
): Promise<void> {
  const token = TG_TOKEN();
  const chatId = TG_CHAT();
  if (!token || !chatId) return;

  const { pipeline, problemes, retours, finance } = snapshot;

  // Detect first-run (no history for deltas)
  const isFirstRun = Object.values(deltas.vsYesterday).every((d) => d === 0);

  const lines: string[] = [
    "📊 <b>Femme Soir — Noest Dashboard</b>",
    `📅 ${snapshot.date}`,
    "",
    "📦 <b>Pipeline</b>",
    `À expédier: ${fmtDelta(pipeline.aExpedier, deltas.vsYesterday["pipeline.aExpedier"])}`,
    `À préparer: ${fmtDelta(pipeline.aPreparer, deltas.vsYesterday["pipeline.aPreparer"])}`,
    `En préparation: ${pipeline.enPreparation}`,
    `En ramassage: ${pipeline.enRamassage}`,
    `En traitement: ${fmtDelta(pipeline.enTraitement, deltas.vsYesterday["pipeline.enTraitement"])}`,
    `Vers Hub: ${pipeline.versHub} / En Hub: ${pipeline.enHub}`,
    `En livraison: ${pipeline.enLivraison}`,
    "",
    "⚠️ <b>Problèmes</b>",
    `Suspendus: ${fmtDelta(problemes.suspendus, deltas.vsYesterday["problemes.suspendus"])}`,
    `Désaccords: ${problemes.desaccord}`,
    "",
    "↩️ <b>Retours</b>",
    `Station: ${retours.chezStation} | Hub central: ${retours.chezHubCentral} | Transit: ${retours.enTransitStock} | Reçus: ${retours.recu}`,
    "",
    "💰 <b>Finance</b>",
    `Livré non encaissé: ${fmtDelta(finance.livreNonEncaisse, deltas.vs7dAvg["finance.livreNonEncaisse"])}`,
    `Livré encaissé: ${finance.livreEncaisse}`,
    `Recouvrements: ${finance.recouvrements} / Recouvrés: ${finance.recouvres}`,
    `Chèques en attente: ${finance.chequeEncours}`,
    "",
    "🔴 <b>Commandes Suspendues</b>",
  ];

  if (suspendedDetails && suspendedDetails.orders.length > 0) {
    const sorted = [...suspendedDetails.orders].sort(
      (a, b) => b.montant - a.montant
    );
    for (const order of sorted.slice(0, 10)) {
      const clientClean = order.client.substring(0, 20);
      lines.push(
        `• ${order.tracking} — ${clientClean}: ${order.montant.toLocaleString()} DA`
      );
    }
    if (sorted.length > 10) {
      lines.push(`  … et ${sorted.length - 10} autre(s)`);
    }
    lines.push(`<b>Total bloqué: ${suspendedDetails.totalAmount.toLocaleString()} DA</b>`);

    if (analyses && analyses.length > 0) {
      lines.push("");
      for (const a of analyses) {
        const icon = a.riskLevel === "high" ? "🔴" : a.riskLevel === "medium" ? "🟡" : "ℹ️";
        lines.push(`${icon} <b>Analyse:</b> ${a.summary}`);
        if (a.keyIssues.length > 0) {
          for (const issue of a.keyIssues.slice(0, 3)) {
            lines.push(`  • ${issue}`);
          }
        }
        if (a.recommendations.length > 0) {
          for (const rec of a.recommendations.slice(0, 2)) {
            lines.push(`  → ${rec}`);
          }
        }
      }
    }
  } else {
    lines.push("✅ Aucune commande suspendue");
  }

  lines.push("", "🔵 <b>Livré Non Encaissé</b>");

  if (nonEncaisseDetails && nonEncaisseDetails.orders.length > 0) {
    const sorted = [...nonEncaisseDetails.orders].sort(
      (a, b) => b.montant - a.montant
    );
    for (const order of sorted.slice(0, 10)) {
      const clientClean = order.client.substring(0, 20);
      lines.push(
        `• ${order.tracking} — ${clientClean}: ${order.montant.toLocaleString()} DA (livré ${order.livredAt.substring(0, 10)})`
      );
    }
    if (sorted.length > 10) {
      lines.push(`  … et ${sorted.length - 10} autre(s)`);
    }
    lines.push(`<b>Total non encaissé: ${nonEncaisseDetails.totalAmount.toLocaleString()} DA</b>`);
    lines.push(`<b>Somme livrée: ${nonEncaisseDetails.sumLivred.toLocaleString()} DA</b>`);
  } else {
    lines.push("✅ Aucune commande non encaissée");
  }

  if (nonEncaisseDetails && nonEncaisseDetails.orderCount > 0) {
    lines.push(
      "",
      `💳 <b>Livré non encaissé (${nonEncaisseDetails.orderCount} commandes)</b>`,
      `<b>Total à récupérer: ${nonEncaisseDetails.totalAmount.toLocaleString()} DA</b>`
    );
  }

  if (stockDetails && stockDetails.totalProducts > 0) {
    const stockLines: string[] = [
      "",
      `📦 <b>Stock Produits (${stockDetails.totalProducts} produits)</b>`,
      `Stock disponible total: ${stockDetails.totalStockDisponible} unités`,
    ];
    if (stockDetails.outOfStock.length > 0) {
      stockLines.push(`🔴 <b>Épuisés (${stockDetails.outOfStock.length}):</b>`);
      for (const p of stockDetails.outOfStock.slice(0, 5)) {
        stockLines.push(`  • ${p.title || p.reference} — retours: ${p.retours}`);
      }
    }
    if (stockDetails.lowStock.length > 0) {
      stockLines.push(`🟡 <b>Stock bas ≤5 (${stockDetails.lowStock.length}):</b>`);
      for (const p of stockDetails.lowStock.slice(0, 5)) {
        stockLines.push(`  • ${p.title || p.reference}: ${p.stockDisponible} unités`);
      }
    }
    if (stockDetails.outOfStock.length === 0 && stockDetails.lowStock.length === 0) {
      stockLines.push("✅ Niveaux de stock normaux");
    }
    lines.push(...stockLines);
  }

  lines.push("", "🔔 <b>Alertes</b>");

  if (isFirstRun) {
    lines.push("ℹ️ Première mesure — aucune comparaison disponible");
  }

  if (alerts.length === 0 && !isFirstRun) {
    lines.push("✅ Tout est normal, aucune alerte.");
  } else {
    lines.push(fmtList(alerts));
  }

  const text = lines.join("\n");

  const res = await fetch(
    `https://api.telegram.org/bot${token}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
      }),
    }
  );

  if (!res.ok) {
    const body = await res.text();
    console.warn(`Telegram digest failed (${res.status}): ${body}`);
  }
}
