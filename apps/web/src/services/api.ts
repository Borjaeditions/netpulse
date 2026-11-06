export interface SpeedTestResult {
  id?: number;
  timestamp: string;
  serverId: string;
  serverName: string;
  serverUrl: string;
  downloadMbps: number;
  uploadMbps: number;
  pingMs: number;
  jitterMs: number;
  bytesSent: number;
  bytesReceived: number;
}

interface SpeedTestRow {
  id: number;
  timestamp: string;
  server_id: string;
  server_name: string;
  server_url: string;
  download_mbps: number;
  upload_mbps: number;
  ping_ms: number;
  jitter_ms: number;
  bytes_sent: number;
  bytes_received: number;
}

export function normalizeSpeedTest(
  row: SpeedTestRow,
): SpeedTestResult {
  return {
    id: row.id,
    timestamp: row.timestamp,
    serverId: row.server_id,
    serverName: row.server_name,
    serverUrl: row.server_url,
    downloadMbps: row.download_mbps,
    uploadMbps: row.upload_mbps,
    pingMs: row.ping_ms,
    jitterMs: row.jitter_ms,
    bytesSent: row.bytes_sent,
    bytesReceived: row.bytes_received,
  };
}

async function requestJson<T>(url: string): Promise<T> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Error HTTP ${response.status} al consultar ${url}`,
    );
  }

  return response.json() as Promise<T>;
}

export async function getHealth() {
  return requestJson<{
    status: string;
    application: string;
    timestamp: string;
  }>("/api/health");
}

export async function getSpeedTests(
  limit = 500,
): Promise<SpeedTestResult[]> {
  const body = await requestJson<{
    count: number;
    results: SpeedTestRow[];
  }>(`/api/speedtests?limit=${limit}`);

  return body.results
    .map(normalizeSpeedTest)
    .sort(
      (a, b) =>
        Date.parse(a.timestamp) - Date.parse(b.timestamp),
    );
}

export async function getLatestSpeedTest():
  Promise<SpeedTestResult | null> {
  const body = await requestJson<{
    result: SpeedTestRow | null;
  }>("/api/speedtests/latest");

  return body.result
    ? normalizeSpeedTest(body.result)
    : null;
}

export async function runSpeedTest():
  Promise<SpeedTestResult> {
  const response = await fetch("/api/speedtest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });

  if (!response.ok) {
    throw new Error(
      `No fue posible ejecutar la medición (${response.status})`,
    );
  }

  const body: { result: SpeedTestResult } =
    await response.json();

  return body.result;
}

export type ScheduleType = "interval" | "alarm";

export interface ScheduleInput {
  name: string;
  type: ScheduleType;
  enabled: boolean;
  intervalMinutes?: number;
  timeOfDay?: string;
  daysOfWeek?: number[];
  timezone?: string;
}


// Programador: contratos SQLite y operaciones HTTP.
export interface Schedule {
  id: number;
  name: string;
  type: ScheduleType;
  enabled: number;
  interval_minutes: number | null;
  time_of_day: string | null;
  days_of_week: string | null;
  timezone: string;
  next_run_at: string | null;
  created_at: string;
}

export interface ScheduleExecution {
  id: number;
  schedule_id: number;
  scheduled_at: string;
  started_at: string | null;
  finished_at: string | null;
  status: "running" | "completed" | "failed" | "skipped";
  message: string | null;
}

async function sendScheduleRequest<T>(
  url: string,
  method: "POST" | "PUT",
  data: ScheduleInput,
): Promise<T> {
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const body: { message?: string; error?: string } =
      await response.json().catch(() => ({}));
    throw new Error(body.message ?? body.error ?? `Error HTTP ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function getSchedules(): Promise<Schedule[]> {
  const body = await requestJson<{ results: Schedule[] }>("/api/schedules");
  return body.results;
}

export async function createSchedule(input: ScheduleInput): Promise<Schedule> {
  const body = await sendScheduleRequest<{ result: Schedule }>(
    "/api/schedules", "POST", input,
  );
  return body.result;
}

export async function updateSchedule(
  id: number,
  input: ScheduleInput,
): Promise<Schedule> {
  const body = await sendScheduleRequest<{ result: Schedule }>(
    `/api/schedules/${id}`, "PUT", input,
  );
  return body.result;
}

export async function deleteSchedule(id: number): Promise<void> {
  const response = await fetch(`/api/schedules/${id}`, { method: "DELETE" });
  if (!response.ok) {
    throw new Error(`No fue posible eliminar la programación (${response.status})`);
  }
}

export async function getScheduleExecutions(limit = 20): Promise<ScheduleExecution[]> {
  const body = await requestJson<{ results: ScheduleExecution[] }>(
    `/api/schedules/executions?limit=${limit}`,
  );
  return body.results;
}
