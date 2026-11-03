import Fastify from "fastify";

const app = Fastify({
  logger: true,
});

app.get("/api/health", async () => {
  return {
    status: "ok",
    application: "NetPulse",
    timestamp: new Date().toISOString(),
  };
});

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
