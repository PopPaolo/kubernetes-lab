import { Router } from "express";
import type { Redis } from "ioredis";
import { checkRedis, getQueueSummary } from "../../queue/client.js";
import type { WebhookQueue } from "./types.js";

// Queue summary endpoint.
export function createQueueRoutes(queue: WebhookQueue, redis: Redis): Router {
  const router = Router();

  router.get("/", async (_req, res) => {
    const redisReady = await checkRedis(redis);
    res.json({
      redis: redisReady,
      queue: await getQueueSummary(queue)
    });
  });

  return router;
}
