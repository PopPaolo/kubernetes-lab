import { Router } from "express";
import type { Redis } from "ioredis";
import { config } from "../../shared/config.js";
import { registry } from "../../shared/metrics.js";
import { checkRedis, getQueueSummary } from "../../queue/client.js";
import type { WebhookQueue } from "./types.js";

// Health, readiness, metrics, and the simple root status route.
export function createHealthRoutes(queue: WebhookQueue, redis: Redis): Router {
  const router = Router();

  // Root status.
  router.get("/", async (_req, res) => {
    const summary = await getQueueSummary(queue);
    res.json({
      service: "webhook-queue-lab-api",
      version: config.APP_VERSION,
      queue: summary
    });
  });

  // Liveness.
  router.get("/healthz", (_req, res) => {
    res.json({ status: "ok" });
  });

  router.get("/readyz", async (_req, res) => {
    const redisReady = await checkRedis(redis);
    res.status(redisReady ? 200 : 503).json({
      status: redisReady ? "ready" : "not-ready",
      redis: redisReady
    });
  });

  // Prometheus scrape endpoint.
  router.get("/metrics", async (_req, res) => {
    await getQueueSummary(queue);
    await checkRedis(redis);
    res.setHeader("Content-Type", registry.contentType);
    res.send(await registry.metrics());
  });

  return router;
}
