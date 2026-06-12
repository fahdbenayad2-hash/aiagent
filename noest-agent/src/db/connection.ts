import { DatabaseSync } from "node:sqlite";
import path from "path";
import fs from "fs";
import os from "os";
import { runMigration } from "./migrations/001_init.js";

let db: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (db) return db;

  const dbPath =
    process.env.DB_PATH ||
    path.join(os.homedir(), ".noest-agent", "history.db");

  const dir = path.dirname(dbPath);
  fs.mkdirSync(dir, { recursive: true });

  db = new DatabaseSync(dbPath);
  runMigration(db);
  return db;
}
