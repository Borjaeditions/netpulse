import { runSpeedTest, SpeedTestError } from "./speedtest.service.js";
import { publishEvent } from "./events.service.js";
import { nextExecution } from "./schedule-time.service.js";
import {
  dueSchedules,
  listSchedules,
  setNextRun,
  logExecution,
  finishExecution,
  type ScheduleRow,
} from "../database/schedules.repository.js";
import { db } from "../database/sqlite.js";

let timer: NodeJS.Timeout | undefined;
let checking = false;

function configFromRow(row: ScheduleRow) {
  return {
    type: row.type,
    intervalMinutes: row.interval_minutes,
    timeOfDay: row.time_of_day,
    daysOfWeek: row.days_of_week
      ? JSON.parse(row.days_of_week) as number[]
      : null,
    timezone: row.timezone,
  };
}

async function executeSchedule(row: ScheduleRow): Promise<void> {
  const scheduledAt = row.next_run_at!;
  const now = new Date();

  // Consumimos la ejecución antes de lanzar LibreSpeed.
  // Si el proceso reinicia, no se repetirá esta ejecución.
  setNextRun(
    row.id,
    nextExecution(configFromRow(row), now),
  );

  const executionId = logExecution(
    row.id,
    scheduledAt,
    "running",
  );

  try {
    await runSpeedTest();

    finishExecution(executionId, "completed");

    publishEvent("schedule.completed", {
      scheduleId: row.id,
      executionId,
    });
  } catch (error) {
    const overlap =
      error instanceof SpeedTestError &&
      error.statusCode === 409;

    finishExecution(
      executionId,
      overlap ? "skipped" : "failed",
      overlap
        ? "Ya existía una medición en ejecución"
        : "No fue posible completar la medición",
    );

    publishEvent("schedule.failed", {
      scheduleId: row.id,
      executionId,
      status: overlap ? "skipped" : "failed",
    });
  }
}

async function tick(): Promise<void> {
  if (checking) return;
  checking = true;

  try {
    const now = new Date().toISOString();
    const due = dueSchedules(now);

    // No esperamos la medición: LibreSpeed puede tardar
    // decenas de segundos. Su propia exclusión mutua evita
    // que dos pruebas se ejecuten al mismo tiempo.
    for (const schedule of due) {
      void executeSchedule(schedule).catch(error => {
        console.error("Scheduler execution error:", error);
      });
    }
  } finally {
    checking = false;
  }
}

export function startScheduler(): void {
  if (timer) return;

  // Las ejecuciones interrumpidas por un reinicio no
  // se consideran completadas.
  db.prepare(`
    UPDATE schedule_executions
    SET status = 'failed',
        finished_at = ?,
        message = 'Interrumpida por reinicio del servicio'
    WHERE status = 'running'
  `).run(new Date().toISOString());

  // No recuperamos en ráfaga las mediciones perdidas.
  const now = new Date();

  for (const row of listSchedules()) {
    if (!row.enabled) continue;

    setNextRun(
      row.id,
      nextExecution(configFromRow(row), now),
    );
  }

  timer = setInterval(() => {
    void tick().catch(error => {
      console.error("Scheduler tick error:", error);
    });
  }, 5000);

  timer.unref();
}

export function stopScheduler(): void {
  if (timer) clearInterval(timer);
  timer = undefined;
}
