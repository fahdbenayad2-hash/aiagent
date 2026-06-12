import type { DatabaseSync } from "node:sqlite";

const MIGRATION_SQL = `
CREATE TABLE IF NOT EXISTS snapshots (
    date       TEXT PRIMARY KEY,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    raw_json   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS metrics (
    date        TEXT NOT NULL,
    metric_name TEXT NOT NULL,
    value       INTEGER NOT NULL,
    PRIMARY KEY (date, metric_name)
);

CREATE INDEX IF NOT EXISTS idx_metrics_name_date ON metrics(metric_name, date);
`;

export function runMigration(db: DatabaseSync): void {
  db.exec(MIGRATION_SQL);
}
