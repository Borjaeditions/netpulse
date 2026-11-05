import "./database/sqlite.js";
import Fastify from "fastify";
import { speedTestRoutes } from "./routes/speedtest.routes.js";
import { historyRoutes } from "./routes/history.routes.js";

const app = Fastify({
  logger: true,
});

app.get("/api/health", async () => ({
  status: "ok",
  application: "NetPulse",
  timestamp: new Date().toISOString(),
}));

app.register(speedTestRoutes);
app.register(historyRoutes);

const port = Number(process.env.PORT ?? 3100);

try {
  await app.listen({
    port,
    host: "0.0.0.0",
  });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
