import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

const databasePath =
  process.env.SQLITE_PATH ?? "./data/netpulse.db";

mkdirSync(dirname(databasePath), { recursive: true });

export const db = new DatabaseSync(databasePath);

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA busy_timeout = 5000;

  CREATE TABLE IF NOT EXISTS speed_tests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    server_id TEXT NOT NULL,
    server_name TEXT NOT NULL,
    server_url TEXT NOT NULL,
    download_mbps REAL NOT NULL,
    upload_mbps REAL NOT NULL,
    ping_ms REAL NOT NULL,
    jitter_ms REAL NOT NULL,
    bytes_sent INTEGER NOT NULL,
    bytes_received INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_speed_tests_timestamp
  ON speed_tests(timestamp DESC);


CREATE TABLE IF NOT EXISTS schedules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL
    CHECK (type IN ('interval', 'alarm')),
  enabled INTEGER NOT NULL DEFAULT 1
    CHECK (enabled IN (0, 1)),
  interval_minutes INTEGER,
  time_of_day TEXT,
  days_of_week TEXT,
  timezone TEXT NOT NULL DEFAULT 'America/Mexico_City',
  next_run_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (
    (type = 'interval'
      AND interval_minutes IS NOT NULL
      AND interval_minutes >= 5)
    OR
    (type = 'alarm'
      AND time_of_day IS NOT NULL
      AND days_of_week IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_schedules_due
ON schedules(enabled, next_run_at);

CREATE TABLE IF NOT EXISTS schedule_executions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  schedule_id INTEGER NOT NULL,
  scheduled_at TEXT NOT NULL,
  started_at TEXT,
  finished_at TEXT,
  status TEXT NOT NULL
    CHECK (status IN (
      'running', 'completed', 'failed', 'skipped'
    )),
  message TEXT,
  FOREIGN KEY (schedule_id) REFERENCES schedules(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_schedule_execution_unique
ON schedule_executions(schedule_id, scheduled_at);  

`);
