import type { DatabaseSync } from "node:sqlite";
import { DashboardSnapshot, FlatMetrics } from "../types.js";
import { getMetricHistory, getYesterdayMetrics } from "../db/repositories/snapshotRepo.js";

const METRIC_KEYS: Array<keyof FlatMetrics> = [
  "pipeline.aExpedier",
  "pipeline.aPreparer",
  "pipeline.enPreparation",
  "pipeline.enRamassage",
  "pipeline.enTraitement",
  "pipeline.versHub",
  "pipeline.enHub",
  "pipeline.enLivraison",
  "problemes.suspendus",
  "problemes.desaccord",
  "retours.chezStation",
  "retours.chezHubCentral",
  "retours.enTransitStock",
  "retours.recu",
  "finance.livreNonEncaisse",
  "finance.livreEncaisse",
  "finance.recouvrements",
  "finance.recouvres",
  "finance.chequeEncours",
];

export function flattenSnapshot(snapshot: DashboardSnapshot): FlatMetrics {
  const flat: FlatMetrics = {};
  for (const [domain, values] of Object.entries(snapshot)) {
    if (domain === "date") continue;
    for (const [key, value] of Object.entries(values as Record<string, number>)) {
      flat[`${domain}.${key}`] = value;
    }
  }
  return flat;
}

export function computeDeltas(
  today: FlatMetrics,
  db: DatabaseSync,
  date: string
): { vsYesterday: FlatMetrics; vs7dAvg: FlatMetrics } {
  const vsYesterday: FlatMetrics = {};
  const vs7dAvg: FlatMetrics = {};

  const yesterdayMetrics = getYesterdayMetrics(db, date);

  for (const key of METRIC_KEYS) {
    const current = today[key] ?? 0;

    // vs yesterday
    if (yesterdayMetrics && key in yesterdayMetrics) {
      vsYesterday[key] = current - yesterdayMetrics[key];
    } else {
      vsYesterday[key] = 0; // first run or no data
    }

    // vs 7-day average (excluding today)
    const history = getMetricHistory(db, key, 9); // grab enough to find 7 previous days
    const previousDays = history.filter((h) => h.date < date).slice(0, 7);
    if (previousDays.length > 0) {
      const sum = previousDays.reduce((acc, h) => acc + h.value, 0);
      const avg = sum / previousDays.length;
      vs7dAvg[key] = Math.round((current - avg) * 10) / 10;
    } else {
      vs7dAvg[key] = 0; // not enough history
    }
  }

  return { vsYesterday, vs7dAvg };
}
