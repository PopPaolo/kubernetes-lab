import express from "express";
import { config } from "../shared/config.js";
import { logger } from "../shared/logger.js";
import { jobsEnqueuedTotal } from "../shared/metrics.js";
import { closeRedis, createRedisConnection, createWebhookQueue } from "../queue/client.js";
import type { WebhookJob } from "../queue/types.js";
import { errorHandler } from "./middleware/error-handler.js";
import { requestMetrics } from "./middleware/request-metrics.js";
import { createDebugRoutes } from "./routes/debug.js";
import { createHealthRoutes } from "./routes/health.js";
import { createJobRoutes } from "./routes/jobs.js";
import { createQueueRoutes } from "./routes/queue.js";

const app = express();
const queue = createWebhookQueue();
const redis = createRedisConnection();

// App-wide middleware.
app.use(express.json());
app.use(requestMetrics);

// API routes.
app.use("/", createHealthRoutes(queue, redis));
app.use("/api/jobs", createJobRoutes(queue, enqueueJob));
app.use("/api/queue", createQueueRoutes(queue, redis));
app.use("/debug/jobs", createDebugRoutes(enqueueJob));
app.use(errorHandler);

// Add a job to the shared BullMQ queue.
async function enqueueJob(data: WebhookJob) {
  const job = await queue.add("deliver-webhook", data);
  jobsEnqueuedTotal.inc();
  logger.info({ jobId: job.id, eventType: data.eventType }, "job enqueued");
  return job;
}

const server = app.listen(config.API_PORT, () => {
  logger.info({ port: config.API_PORT }, "api listening");
});

// Graceful shutdown for local runs and containers.
async function shutdown(signal: string) {
  logger.info({ signal }, "shutting down api");
  server.close();
  await Promise.allSettled([queue.close(), closeRedis(redis)]);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
