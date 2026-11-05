import { DateTime } from "luxon";

export const DEFAULT_TIMEZONE = "America/Mexico_City";

export interface ScheduleConfig {
  type: "interval" | "alarm";
  intervalMinutes?: number | null;
  timeOfDay?: string | null;
  daysOfWeek?: number[] | null;
  timezone?: string;
}

// Días: 0 = domingo, 1 = lunes, ..., 6 = sábado.
export function nextExecution(
  config: ScheduleConfig,
  after = new Date(),
): string {
  const zone = config.timezone ?? DEFAULT_TIMEZONE;

  if (!DateTime.now().setZone(zone).isValid) {
    throw new Error("Zona horaria inválida");
  }

  const now = DateTime.fromJSDate(after, { zone });

  if (config.type === "interval") {
    const minutes = config.intervalMinutes;

    if (!Number.isInteger(minutes) ||
        minutes === undefined ||
        minutes === null ||
        minutes < 5 ||
        minutes > 10080) {
      throw new Error("Intervalo inválido");
    }

    return now.plus({ minutes }).toUTC().toISO()!;
  }

  const time = config.timeOfDay;
  const days = config.daysOfWeek;

  if (!time || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
    throw new Error("Hora inválida");
  }

  if (!days?.length ||
      days.some(day => !Number.isInteger(day) ||
        day < 0 || day > 6)) {
    throw new Error("Días inválidos");
  }

  const [hour, minute] = time.split(":").map(Number);

  for (let offset = 0; offset <= 7; offset++) {
    const date = now.plus({ days: offset }).startOf("day");
    const dayOfWeek = date.weekday % 7;

    if (!days.includes(dayOfWeek)) continue;

    const candidate = date.set({
      hour,
      minute,
      second: 0,
      millisecond: 0,
    });

    if (candidate.isValid && candidate > now) {
      return candidate.toUTC().toISO()!;
    }
  }

  throw new Error("No fue posible calcular la próxima alarma");
}
