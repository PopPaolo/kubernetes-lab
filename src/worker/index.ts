import express from "express";
import { Worker } from "bullmq";
import { config, redisOptions } from "../shared/config.js";
import { logger } from "../shared/logger.js";
import { closeRedis, createRedisConnection } from "../queue/client.js";
import type { WebhookJob } from "../queue/types.js";
import { processWebhookJob } from "./processor.js";
import { createWorkerRoutes } from "./routes.js";

const redis = createRedisConnection();

// BullMQ worker process.
const worker = new Worker<WebhookJob>(config.QUEUE_NAME, processWebhookJob, {
  connection: redisOptions,
  concurrency: config.WORKER_CONCURRENCY
});

// Job lifecycle logs.
worker.on("completed", (job) => {
  logger.info({ jobId: job.id }, "job completed");
});

worker.on("failed", (job, error) => {
  logger.warn({ jobId: job?.id, attemptsMade: job?.attemptsMade, error }, "job failed");
});

worker.on("error", (error) => {
  logger.error({ error }, "worker error");
});

const app = express();

// Probe and metrics routes.
app.use(createWorkerRoutes(redis, worker));

const metricsServer = app.listen(config.WORKER_METRICS_PORT, () => {
  logger.info(
    {
      metricsPort: config.WORKER_METRICS_PORT,
      queue: config.QUEUE_NAME,
      concurrency: config.WORKER_CONCURRENCY
    },
    "worker started"
  );
});

// Graceful shutdown for local runs and containers.
async function shutdown(signal: string) {
  logger.info({ signal }, "shutting down worker");
  metricsServer.close();
  await Promise.allSettled([worker.close(), closeRedis(redis)]);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
