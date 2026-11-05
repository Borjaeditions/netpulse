import { spawn } from "node:child_process";
import { saveSpeedTest } from "../database/speedtest.repository.js";
import { publishEvent } from "./events.service.js";

const TIMEOUT_MS = 90_000;
const SERVER_ID = "93"; // Chicago, Sharktech

let running = false;

interface LibreSpeedResult {
  timestamp: string;
  server: {
    name: string;
    url: string;
  };
  bytes_sent: number;
  bytes_received: number;
  ping: number;
  jitter: number;
  upload: number;
  download: number;
}

export interface SpeedTestResult {
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

export class SpeedTestError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "SpeedTestError";
  }
}

function validateResult(value: unknown): LibreSpeedResult {
  if (!Array.isArray(value) || value.length !== 1) {
    throw new Error("Respuesta inesperada de LibreSpeed");
  }

  const result = value[0] as LibreSpeedResult;

  if (
    !result ||
    typeof result.timestamp !== "string" ||
    typeof result.server?.name !== "string" ||
    typeof result.server?.url !== "string" ||
    ![
      result.download,
      result.upload,
      result.ping,
      result.jitter,
      result.bytes_sent,
      result.bytes_received,
    ].every((number) =>
      typeof number === "number" &&
      Number.isFinite(number) &&
      number >= 0
    )
  ) {
    throw new Error("Datos inválidos de LibreSpeed");
  }

  return result;
}

function executeLibreSpeed(): Promise<string> {
  return new Promise((resolve, reject) => {
    const args = [
      "--server", SERVER_ID,
      "--json",
      "--no-icmp",
      "--telemetry-level", "disabled",
      "--secure",
      "--duration", "10",
      "--timeout", "10",
    ];

    const child = spawn("librespeed-cli", args, {
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let settled = false;
    let timedOut = false;

    const finish = (error?: Error, output?: string) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);

      if (error) reject(error);
      else resolve(output ?? "");
    };

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, TIMEOUT_MS);

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();

      if (stdout.length > 1_000_000) {
        child.kill("SIGKILL");
      }
    });

    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString().slice(0, 10_000);
    });

    child.on("error", (error) => {
      finish(error);
    });

    child.on("close", (code) => {
      if (timedOut) {
        finish(new SpeedTestError(
          "La medición superó el tiempo máximo",
          504,
        ));
        return;
      }

      if (code !== 0) {
        finish(new Error(
          `LibreSpeed terminó con código ${code}: ${stderr.slice(0, 500)}`
        ));
        return;
      }

      finish(undefined, stdout);
    });
  });
}

export async function runSpeedTest(): Promise<SpeedTestResult> {
  if (running) {
    throw new SpeedTestError(
      "Ya existe una medición en ejecución",
      409,
    );
  }

  running = true;

  publishEvent("speedtest.started", {
    serverId: SERVER_ID,
  });

  try {
    const output = await executeLibreSpeed();
    const data = validateResult(JSON.parse(output));

    const result: SpeedTestResult = {
      timestamp: data.timestamp,
      serverId: SERVER_ID,
      serverName: data.server.name,
      serverUrl: data.server.url,
      downloadMbps: data.download,
      uploadMbps: data.upload,
      pingMs: data.ping,
      jitterMs: data.jitter,
      bytesSent: data.bytes_sent,
      bytesReceived: data.bytes_received,
    };

    // Primero almacenamos la medición en SQLite
    const id = saveSpeedTest(result);

    // Después notificamos a los clientes conectados
    publishEvent("speedtest.completed", {
      id,
      ...result,
    });

    return result;
  } catch (error) {
    publishEvent("speedtest.failed", {
      message: "No fue posible completar la medición",
    });

    if (error instanceof SpeedTestError) {
      throw error;
    }

    throw new SpeedTestError(
      "No fue posible completar la medición",
      502,
    );
  } finally {
    running = false;
  }
}
