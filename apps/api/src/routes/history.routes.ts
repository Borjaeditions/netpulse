
import type { FastifyInstance } from "fastify";

import {
  getLatestSpeedTest,
  getSpeedTests,
  deleteSpeedTest,
  deleteSpeedTestsBefore,
  deleteAllSpeedTests,
} from "../database/speedtest.repository.js";

export async function historyRoutes(app: FastifyInstance) {
  // ==========================================
  // Consultar historial
  // ==========================================

  app.get<{ Querystring: { limit?: number } }>(
    "/api/speedtests",
    {
      schema: {
        querystring: {
          type: "object",
          properties: {
            limit: {
              type: "integer",
              minimum: 1,
              maximum: 500,
              default: 50,
            },
          },
          additionalProperties: false,
        },
      },
    },
    async (request) => {
      const { limit = 50 } = request.query;
      const results = getSpeedTests(limit);

      return {
        count: results.length,
        results,
      };
    },
  );

  // ==========================================
  // Última medición
  // ==========================================

  app.get("/api/speedtests/latest", async () => {
    return {
      result: getLatestSpeedTest(),
    };
  });

  // ==========================================
  // Eliminar una medición por ID
  // ==========================================

  app.delete<{ Params: { id: string } }>(
    "/api/speedtests/:id",
    {
      schema: {
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: {
              type: "string",
              pattern: "^[1-9][0-9]*$",
            },
          },
        },
      },
    },
    async (request, reply) => {
      const id = Number(request.params.id);

      if (!Number.isSafeInteger(id) || id <= 0) {
        return reply.code(400).send({
          error: "ID de medición inválido",
        });
      }

      const deleted = deleteSpeedTest(id);

      if (!deleted) {
        return reply.code(404).send({
          error: "La medición no existe",
        });
      }

      return {
        success: true,
        deleted: 1,
      };
    },
  );

  // ==========================================
  // Eliminar mediciones anteriores a una fecha
  // ==========================================

  app.delete<{ Querystring: { before: string } }>(
    "/api/speedtests",
    {
      schema: {
        querystring: {
          type: "object",
          required: ["before"],
          properties: {
            before: {
              type: "string",
            },
          },
          additionalProperties: false,
        },
      },
    },
    async (request, reply) => {
      const { before } = request.query;

      const isoDatePattern =
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;

      if (!before || !isoDatePattern.test(before)) {
        return reply.code(400).send({
          error: "Fecha inválida. Usa ISO 8601 con zona horaria.",
        });
      }

      const date = new Date(before);

      if (Number.isNaN(date.getTime())) {
        return reply.code(400).send({
          error: "Fecha inválida",
        });
      }

      const deleted = deleteSpeedTestsBefore(
        date.toISOString(),
      );

      return {
        success: true,
        deleted,
      };
    },
  );

  // ==========================================
  // Eliminar todo el historial
  // ==========================================

  app.delete("/api/speedtests/all", async (request, reply) => {
    const confirmation =
      request.headers["x-confirm-delete"];

    if (confirmation !== "DELETE_ALL") {
      return reply.code(400).send({
        error: "Confirmación requerida",
        message: "Envía X-Confirm-Delete: DELETE_ALL",
      });
    }

    const deleted = deleteAllSpeedTests();

    return {
      success: true,
      deleted,
    };
  });
}
