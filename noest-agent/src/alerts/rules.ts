import { FlatMetrics, AlertRule } from "../types.js";

// Configuration seuils — ajustables ici
const SEUIL_SUSPENDUS_ELEVES = 5;
const SEUIL_HAUSSE_CASH_PCT = 20;
const SEUIL_PIC_RETOURS_PCT = 30;

const RULES: AlertRule[] = [
  {
    id: "desaccord-present",
    description: "Litige détecté",
    severity: "🔴",
    check: (current) => {
      const v = current["problemes.desaccord"] ?? 0;
      return v > 0 ? `🔴 ${v} commande(s) en litige/désaccord` : null;
    },
  },
  {
    id: "suspendus-hausse",
    description: "Suspendus en hausse par rapport à hier",
    severity: "🟡",
    check: (_current, deltas) => {
      const delta = deltas.vsYesterday["problemes.suspendus"] ?? 0;
      return delta > 0 ? `🟡 Suspendus en hausse (+${delta} vs hier)` : null;
    },
  },
  {
    id: "suspendus-eleves",
    description: "Suspendus élevés (≥ seuil)",
    severity: "🟡",
    check: (current) => {
      const v = current["problemes.suspendus"] ?? 0;
      return v >= SEUIL_SUSPENDUS_ELEVES
        ? `🟡 Suspendus élevés: ${v} (seuil: ${SEUIL_SUSPENDUS_ELEVES})`
        : null;
    },
  },
  {
    id: "cash-hausse",
    description: "Cash en attente (livré non encaissé) en hausse significative",
    severity: "🟡",
    check: (current, deltas) => {
      const delta = deltas.vs7dAvg["finance.livreNonEncaisse"] ?? 0;
      const avg =
        current["finance.livreNonEncaisse"] - delta;
      if (avg <= 0) return null;
      const pct = Math.round((delta / avg) * 100);
      return pct >= SEUIL_HAUSSE_CASH_PCT
        ? `🟡 Cash en attente en hausse de ${pct}% vs moyenne 7j`
        : null;
    },
  },
  {
    id: "cheque-attente",
    description: "Chèques en attente de traitement",
    severity: "ℹ️",
    check: (current) => {
      const v = current["finance.chequeEncours"] ?? 0;
      return v > 0
        ? `ℹ️ ${v} chèque(s) en attente de traitement`
        : null;
    },
  },
  {
    id: "pic-retours",
    description: "Pic de retours par rapport à la moyenne 7j",
    severity: "🟡",
    check: (current, deltas) => {
      const retoursKeys = [
        "retours.chezStation",
        "retours.chezHubCentral",
        "retours.enTransitStock",
        "retours.recu",
      ];
      const currentSum = retoursKeys.reduce(
        (sum, k) => sum + (current[k] ?? 0),
        0
      );
      const avgSum = retoursKeys.reduce((sum, k) => {
        const avgVal =
          (current[k] ?? 0) - (deltas.vs7dAvg[k] ?? 0);
        return sum + avgVal;
      }, 0);
      if (avgSum <= 0) return null;
      const pct = Math.round(((currentSum - avgSum) / avgSum) * 100);
      return pct >= SEUIL_PIC_RETOURS_PCT
        ? `🟡 Retours en hausse de ${pct}% vs moyenne 7j (total: ${currentSum})`
        : null;
    },
  },
];

export function evaluateAlerts(
  current: FlatMetrics,
  deltas: { vsYesterday: FlatMetrics; vs7dAvg: FlatMetrics }
): string[] {
  const triggered: string[] = [];
  for (const rule of RULES) {
    const msg = rule.check(current, deltas);
    if (msg) triggered.push(msg);
  }
  return triggered;
}
