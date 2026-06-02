import { Router } from "express";
import { enqueueFailuresTotal } from "../../shared/metrics.js";
import type { WebhookJob } from "../../queue/types.js";

type EnqueueJob = (data: WebhookJob) => Promise<{ id?: string }>;

// Routes used to create predictable failure and backlog scenarios.
export function createDebugRoutes(enqueueJob: EnqueueJob): Router {
  const router = Router();

  // Poison job.
  router.post("/fail", async (_req, res, next) => {
    try {
      const job = await enqueueJob({
        targetUrl: "https://example.invalid/failing-webhook",
        eventType: "debug.fail",
        payload: { message: "this job is expected to fail" },
        shouldFail: true,
        delayMs: 0
      });
      res.status(202).json({ id: job.id });
    } catch (error) {
      enqueueFailuresTotal.inc();
      next(error);
    }
  });

  // Slow job.
  router.post("/slow", async (_req, res, next) => {
    try {
      const job = await enqueueJob({
        targetUrl: "https://example.invalid/slow-webhook",
        eventType: "debug.slow",
        payload: { message: "this job is intentionally slow" },
        shouldFail: false,
        delayMs: 5000
      });
      res.status(202).json({ id: job.id });
    } catch (error) {
      enqueueFailuresTotal.inc();
      next(error);
    }
  });

  // Backlog generator.
  router.post("/burst", async (req, res, next) => {
    try {
      const requestedCount = Number(req.body?.count ?? 25);
      // Keep local Redis from getting flooded during demos.
      const count = Number.isFinite(requestedCount) ? Math.min(Math.max(requestedCount, 1), 250) : 25;
      const jobs = await Promise.all(
        Array.from({ length: count }, (_, index) =>
          enqueueJob({
            targetUrl: "https://example.invalid/burst-webhook",
            eventType: "debug.burst",
            payload: { index },
            shouldFail: false,
            delayMs: 250
          })
        )
      );

      res.status(202).json({ count: jobs.length, ids: jobs.map((job) => job.id) });
    } catch (error) {
      enqueueFailuresTotal.inc();
      next(error);
    }
  });

  return router;
}
