import { db } from "./sqlite.js";

import type {
  SpeedTestResult,
} from "../services/speedtest.service.js";

export function saveSpeedTest(result: SpeedTestResult): number {
  const statement = db.prepare(`
    INSERT INTO speed_tests (
      timestamp,
      server_id,
      server_name,
      server_url,
      download_mbps,
      upload_mbps,
      ping_ms,
      jitter_ms,
      bytes_sent,
      bytes_received
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const saved = statement.run(
    result.timestamp,
    result.serverId,
    result.serverName,
    result.serverUrl,
    result.downloadMbps,
    result.uploadMbps,
    result.pingMs,
    result.jitterMs,
    result.bytesSent,
    result.bytesReceived,
  );

  return Number(saved.lastInsertRowid);
}

export function getSpeedTests(limit = 50) {
  return db.prepare(`
    SELECT *
    FROM speed_tests
    ORDER BY timestamp DESC, id DESC
    LIMIT ?
  `).all(limit);
}

export function getLatestSpeedTest() {
  return db.prepare(`
    SELECT *
    FROM speed_tests
    ORDER BY timestamp DESC, id DESC
    LIMIT 1
  `).get() ?? null;
}
export function deleteSpeedTest(id: number): boolean {
  const result = db
    .prepare("DELETE FROM speed_tests WHERE id = ?")
    .run(id);

  return result.changes > 0;
}

export function deleteSpeedTestsBefore(before: string): number {
  const result = db
    .prepare(
      "DELETE FROM speed_tests WHERE julianday(timestamp) < julianday(?)",
    )
    .run(before);

  return Number(result.changes);
}

export function deleteAllSpeedTests(): number {
  const result = db
    .prepare("DELETE FROM speed_tests")
    .run();

  return Number(result.changes);
}