import { DashboardSnapshot, FlatMetrics } from "../types.js";

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
  alerts: string[]
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
    "🔔 <b>Alertes</b>",
  ];

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
