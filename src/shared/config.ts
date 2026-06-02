import { z } from "zod";

// Environment variables and defaults.
const envSchema = z.object({
  NODE_ENV: z.string().default("development"),
  API_PORT: z.coerce.number().int().positive().default(3000),
  WORKER_METRICS_PORT: z.coerce.number().int().positive().default(3001),
  REDIS_HOST: z.string().default("127.0.0.1"),
  REDIS_PORT: z.coerce.number().int().positive().default(6379),
  QUEUE_NAME: z.string().default("webhook-delivery"),
  APP_VERSION: z.string().default("dev"),
  JOB_ATTEMPTS: z.coerce.number().int().positive().default(3),
  JOB_BACKOFF_MS: z.coerce.number().int().nonnegative().default(2000),
  WORKER_CONCURRENCY: z.coerce.number().int().positive().default(2)
});

// Fail fast on bad config.
export const config = envSchema.parse(process.env);

// Shared Redis settings for BullMQ and direct health checks.
export const redisOptions = {
  host: config.REDIS_HOST,
  port: config.REDIS_PORT,
  maxRetriesPerRequest: null,
  enableOfflineQueue: false,
  connectTimeout: 1000
};
