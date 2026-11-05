
import type { FastifyInstance } from "fastify";

import {
  getLatestSpeedTest,
  getSpeedTests,
} from "../database/speedtest.repository.js";

export async function historyRoutes(app: FastifyInstance) {
  app.get("/api/speedtests", {
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
  }, async (request) => {
    const { limit } = request.query as { limit: number };

    const results = getSpeedTests(limit);

    return {
      count: results.length,
      results,
    };
  });

  app.get("/api/speedtests/latest", async () => {
    return {
      result: getLatestSpeedTest(),
    };
  });
}
