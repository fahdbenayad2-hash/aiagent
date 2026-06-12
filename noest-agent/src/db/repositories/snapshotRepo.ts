import type { DatabaseSync } from "node:sqlite";
import { NotificationsResponse, FlatMetrics } from "../../types.js";

export function saveSnapshot(
  db: DatabaseSync,
  date: string,
  raw: NotificationsResponse,
  flat: FlatMetrics
): void {
  db.prepare(
    `INSERT OR REPLACE INTO snapshots (date, raw_json) VALUES (?, ?)`
  ).run(date, JSON.stringify(raw));

  const upsertMetric = db.prepare(
    `INSERT OR REPLACE INTO metrics (date, metric_name, value) VALUES (?, ?, ?)`
  );

  db.exec("BEGIN");
  try {
    for (const [name, value] of Object.entries(flat)) {
      upsertMetric.run(date, name, value);
    }
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

export function getMetricHistory(
  db: DatabaseSync,
  metricName: string,
  days: number
): Array<{ date: string; value: number }> {
  const rows = db
    .prepare(
      `SELECT date, value FROM metrics
       WHERE metric_name = ?
       ORDER BY date DESC
       LIMIT ?`
    )
    .all(metricName, days) as Array<{ date: string; value: number }>;

  return rows;
}

export function getYesterdayMetrics(
  db: DatabaseSync,
  date: string
): FlatMetrics | null {
  const rows = db
    .prepare(
      `SELECT metric_name, value FROM metrics
       WHERE date = date(?, '-1 days')`
    )
    .all(date) as Array<{ metric_name: string; value: number }>;

  if (rows.length === 0) return null;

  const result: FlatMetrics = {};
  for (const row of rows) {
    result[row.metric_name] = row.value;
  }
  return result;
}
