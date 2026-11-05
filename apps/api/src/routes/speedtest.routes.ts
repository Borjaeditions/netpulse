
import type { FastifyInstance } from "fastify";

import {
  runSpeedTest,
  SpeedTestError,
} from "../services/speedtest.service.js";

export async function speedTestRoutes(app: FastifyInstance) {
  app.post("/api/speedtest", async (_request, reply) => {
    try {
      const result = await runSpeedTest();

      return reply.code(200).send({
        status: "completed",
        result,
      });
    } catch (error) {
      if (error instanceof SpeedTestError) {
        app.log.warn(
          { error: error.message },
          "Speed test failed",
        );

        return reply.code(error.statusCode).send({
          status: "error",
          message: error.message,
        });
      }

      app.log.error(error);

      return reply.code(500).send({
        status: "error",
        message: "Error interno",
      });
    }
  });
}
