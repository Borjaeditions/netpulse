import type { FastifyInstance } from "fastify";
import { subscribeToEvents } from "../services/events.service.js";

export async function eventRoutes(app: FastifyInstance) {
  app.get("/api/events", (request, reply) => {
    reply.hijack();

    const response = reply.raw;

    response.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    });

    response.flushHeaders();

    response.write(": connected\n\n");

    const unsubscribe = subscribeToEvents((event) => {
      if (response.destroyed || response.writableEnded) return;

      response.write(
        `event: ${event.type}\n` +
        `data: ${JSON.stringify(event)}\n\n`,
      );
    });

    const heartbeat = setInterval(() => {
      if (!response.destroyed && !response.writableEnded) {
        response.write(": heartbeat\n\n");
      }
    }, 25_000);

    const cleanup = () => {
      clearInterval(heartbeat);
      unsubscribe();
    };

    response.on("close", cleanup);
  });
}
