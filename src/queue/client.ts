import { Queue } from "bullmq";
import { Redis } from "ioredis";
import { config, redisOptions } from "../shared/config.js";
import { logger } from "../shared/logger.js";
import { queueDepth, redisConnected } from "../shared/metrics.js";
import type { JobState, WebhookJob } from "./types.js";

// Queue states exposed by the API.
export const jobStates: JobState[] = ["waiting", "active", "completed", "failed", "delayed"];

// Redis client used for health checks.
export function createRedisConnection(): Redis {
  const redis = new Redis(redisOptions);
  redis.on("error", (error) => {
    logger.debug({ error }, "redis connection error");
  });
  return redis;
}

// BullMQ queue used by the API producer.
export function createWebhookQueue(): Queue<WebhookJob, unknown, string> {
  const queue = new Queue<WebhookJob, unknown, string>(config.QUEUE_NAME, {
    connection: redisOptions,
    defaultJobOptions: {
      // Retry failed jobs, but keep Redis history bounded.
      attempts: config.JOB_ATTEMPTS,
      backoff: {
        type: "exponential",
        delay: config.JOB_BACKOFF_MS
      },
      removeOnComplete: {
        age: 3600,
        count: 100
      },
      removeOnFail: {
        age: 86400,
        count: 250
      }
    }
  });

  queue.on("error", (error) => {
    logger.debug({ error }, "queue connection error");
  });

  return queue;
}

// Redis readiness check.
export async function checkRedis(redis: Redis): Promise<boolean> {
  try {
    const pong = await redis.ping();
    const ok = pong === "PONG";
    redisConnected.set(ok ? 1 : 0);
    return ok;
  } catch {
    redisConnected.set(0);
    return false;
  }
}

// Close Redis without hanging on a bad connection.
export async function closeRedis(redis: Redis): Promise<void> {
  if (redis.status === "ready") {
    await redis.quit();
    return;
  }

  redis.disconnect();
}

// Current queue counts by BullMQ state.
export async function getQueueSummary(queue: Queue<WebhookJob>) {
  const counts = await queue.getJobCounts(...jobStates);

  for (const state of jobStates) {
    queueDepth.set({ state }, counts[state] ?? 0);
  }

  return {
    name: queue.name,
    counts
  };
}
