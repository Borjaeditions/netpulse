import { db } from "./sqlite.js";
import {
  nextExecution,
  DEFAULT_TIMEZONE,
  type ScheduleConfig,
} from "../services/schedule-time.service.js";

export interface ScheduleRow {
  id: number;
  name: string;
  type: "interval" | "alarm";
  enabled: number;
  interval_minutes: number | null;
  time_of_day: string | null;
  days_of_week: string | null;
  timezone: string;
  next_run_at: string | null;
  created_at: string;
}

export interface ScheduleInput extends ScheduleConfig {
  name: string;
  enabled?: boolean;
}

export function listSchedules(): ScheduleRow[] {
  return db.prepare(`
    SELECT * FROM schedules ORDER BY id DESC
  `).all() as unknown as ScheduleRow[];
}

export function findSchedule(id: number): ScheduleRow | null {
  return (db.prepare(`
    SELECT * FROM schedules WHERE id = ?
  `).get(id) as unknown as ScheduleRow | undefined) ?? null;
}

export function createSchedule(input: ScheduleInput): ScheduleRow {
  const enabled = input.enabled ?? true;
  const timezone = input.timezone ?? DEFAULT_TIMEZONE;

  // Validamos la configuración incluso si se crea desactivada.
  const next = nextExecution({ ...input, timezone });

  const result = db.prepare(`
    INSERT INTO schedules (
      name, type, enabled, interval_minutes,
      time_of_day, days_of_week, timezone, next_run_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    input.name,
    input.type,
    enabled ? 1 : 0,
    input.type === "interval" ? input.intervalMinutes! : null,
    input.type === "alarm" ? input.timeOfDay! : null,
    input.type === "alarm"
      ? JSON.stringify(input.daysOfWeek)
      : null,
    timezone,
    enabled ? next : null,
  );

  return findSchedule(Number(result.lastInsertRowid))!;
}

export function updateSchedule(
  id: number,
  input: ScheduleInput,
): ScheduleRow | null {
  if (!findSchedule(id)) return null;

  const enabled = input.enabled ?? true;
  const timezone = input.timezone ?? DEFAULT_TIMEZONE;
  const next = nextExecution({ ...input, timezone });

  db.prepare(`
    UPDATE schedules SET
      name = ?, type = ?, enabled = ?,
      interval_minutes = ?, time_of_day = ?,
      days_of_week = ?, timezone = ?, next_run_at = ?
    WHERE id = ?
  `).run(
    input.name,
    input.type,
    enabled ? 1 : 0,
    input.type === "interval" ? input.intervalMinutes! : null,
    input.type === "alarm" ? input.timeOfDay! : null,
    input.type === "alarm"
      ? JSON.stringify(input.daysOfWeek)
      : null,
    timezone,
    enabled ? next : null,
    id,
  );

  return findSchedule(id);
}

export function deleteSchedule(id: number): boolean {
  const result = db.prepare(`
    DELETE FROM schedules WHERE id = ?
  `).run(id);

  return result.changes > 0;
}

export function dueSchedules(now: string): ScheduleRow[] {
  return db.prepare(`
    SELECT * FROM schedules
    WHERE enabled = 1
      AND next_run_at IS NOT NULL
      AND next_run_at <= ?
    ORDER BY next_run_at, id
  `).all(now) as unknown as ScheduleRow[];
}

export function setNextRun(
  id: number,
  next: string | null,
): void {
  db.prepare(`
    UPDATE schedules SET next_run_at = ? WHERE id = ?
  `).run(next, id);
}

export function logExecution(
  scheduleId: number,
  scheduledAt: string,
  status: string,
  message: string | null = null,
): number {
  const result = db.prepare(`
    INSERT INTO schedule_executions (
      schedule_id, scheduled_at, started_at, status, message
    ) VALUES (?, ?, ?, ?, ?)
  `).run(
    scheduleId,
    scheduledAt,
    status === "running" ? new Date().toISOString() : null,
    status,
    message,
  );

  return Number(result.lastInsertRowid);
}

export function finishExecution(
  id: number,
  status: "completed" | "failed" | "skipped",
  message: string | null = null,
): void {
  db.prepare(`
    UPDATE schedule_executions
    SET status = ?, finished_at = ?, message = ?
    WHERE id = ?
  `).run(status, new Date().toISOString(), message, id);
}

export function listExecutions(limit = 50) {
  return db.prepare(`
    SELECT * FROM schedule_executions
    ORDER BY id DESC LIMIT ?
  `).all(limit);
}
