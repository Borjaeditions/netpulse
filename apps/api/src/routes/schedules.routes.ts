import type { FastifyInstance } from "fastify";
import {
  createSchedule,
  updateSchedule,
  deleteSchedule,
  findSchedule,
  listSchedules,
  listExecutions,
  type ScheduleInput,
} from "../database/schedules.repository.js";
import { publishEvent } from "../services/events.service.js";
import { nextExecution } from "../services/schedule-time.service.js";

const scheduleBodySchema = {
  type: "object",
  required: ["name", "type"],
  additionalProperties: false,
  properties: {
    name: { type: "string", minLength: 1, maxLength: 100 },
    type: { type: "string", enum: ["interval", "alarm"] },
    enabled: { type: "boolean" },
    intervalMinutes: {
      type: "integer", minimum: 5, maximum: 10080,
    },
    timeOfDay: {
      type: "string",
      pattern: "^([01][0-9]|2[0-3]):[0-5][0-9]$",
    },
    daysOfWeek: {
      type: "array",
      minItems: 1,
      maxItems: 7,
      uniqueItems: true,
      items: { type: "integer", minimum: 0, maximum: 6 },
    },
    timezone: { type: "string", minLength: 1 },
  },
} as const;

function validateSchedule(input: ScheduleInput): void {
  if (input.type === "interval" &&
      input.intervalMinutes === undefined) {
    throw new Error("Se requiere intervalMinutes");
  }

  if (input.type === "alarm" &&
      (!input.timeOfDay || !input.daysOfWeek?.length)) {
    throw new Error("Se requieren timeOfDay y daysOfWeek");
  }

  nextExecution(input);
}

export async function scheduleRoutes(app: FastifyInstance) {
  app.get("/api/schedules", async () => ({
    results: listSchedules(),
  }));

  app.get("/api/schedules/executions", {
    schema: {
      querystring: {
        type: "object",
        additionalProperties: false,
        properties: {
          limit: {
            type: "integer", minimum: 1,
            maximum: 500, default: 50,
          },
        },
      },
    },
  }, async (request) => {
    const { limit } = request.query as { limit: number };
    return { results: listExecutions(limit) };
  });

  app.post("/api/schedules", {
    schema: { body: scheduleBodySchema },
  }, async (request, reply) => {
    try {
      const input = request.body as ScheduleInput;
      validateSchedule(input);

      const result = createSchedule(input);
      publishEvent("schedule.updated", { id: result.id });

      return reply.code(201).send({ result });
    } catch (error) {
      if (error instanceof Error &&
          (error.message.includes("inválid") ||
           error.message.includes("requiere") ||
           error.message.includes("calcular"))) {
        return reply.code(400).send({ message: error.message });
      }
      throw error;
    }
  });

  app.put("/api/schedules/:id", {
    schema: {
      params: {
        type: "object",
        required: ["id"],
        properties: {
          id: { type: "integer", minimum: 1 },
        },
      },
      body: scheduleBodySchema,
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: number };

    const current = findSchedule(id);
    if (!current) {
      return reply.code(404).send({
        message: "Programación no encontrada",
      });
    }

    try {
      const input = request.body as ScheduleInput;
      validateSchedule(input);

      const result = updateSchedule(id, input);
      publishEvent("schedule.updated", { id });

      return { result };
    } catch (error) {
      if (error instanceof Error &&
          (error.message.includes("inválid") ||
           error.message.includes("requiere") ||
           error.message.includes("calcular"))) {
        return reply.code(400).send({ message: error.message });
      }
      throw error;
    }
  });

  app.delete("/api/schedules/:id", {
    schema: {
      params: {
        type: "object",
        required: ["id"],
        properties: {
          id: { type: "integer", minimum: 1 },
        },
      },
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: number };

    if (!deleteSchedule(id)) {
      return reply.code(404).send({
        message: "Programación no encontrada",
      });
    }

    publishEvent("schedule.updated", { id, deleted: true });
    return reply.code(204).send();
  });
}
