import { Router } from "express";
import type { Worker } from "bullmq";
import type { Redis } from "ioredis";
import { registry, workerActive } from "../shared/metrics.js";
import { checkRedis } from "../queue/client.js";
import type { WebhookJob } from "../queue/types.js";

// Worker probe and metrics routes.
export function createWorkerRoutes(redis: Redis, worker: Worker<WebhookJob>): Router {
  const router = Router();

  // Liveness.
  router.get("/healthz", (_req, res) => {
    res.json({ status: "ok" });
  });

  router.get("/readyz", async (_req, res) => {
    const redisReady = await checkRedis(redis);
    const workerRunning = worker.isRunning();
    workerActive.set(workerRunning ? 1 : 0);
    const ready = redisReady && workerRunning;
    res.status(ready ? 200 : 503).json({
      status: ready ? "ready" : "not-ready",
      redis: redisReady,
      worker: workerRunning
    });
  });

  router.get("/metrics", async (_req, res) => {
    await checkRedis(redis);
    workerActive.set(worker.isRunning() ? 1 : 0);
    res.setHeader("Content-Type", registry.contentType);
    res.send(await registry.metrics());
  });

  return router;
}
