import { Router } from "express";
import { enqueueFailuresTotal } from "../../shared/metrics.js";
import { jobStates } from "../../queue/client.js";
import { webhookJobSchema, type WebhookJob } from "../../queue/types.js";
import type { WebhookQueue } from "./types.js";

type EnqueueJob = (data: WebhookJob) => Promise<{ id?: string; name: string; data: WebhookJob }>;

// Job submission and lookup routes.
export function createJobRoutes(queue: WebhookQueue, enqueueJob: EnqueueJob): Router {
  const router = Router();

  // Submit a job.
  router.post("/", async (req, res, next) => {
    try {
      const data = webhookJobSchema.parse(req.body);
      const job = await enqueueJob(data);
      res.status(202).json({
        id: job.id,
        name: job.name,
        data: job.data
      });
    } catch (error) {
      enqueueFailuresTotal.inc();
      next(error);
    }
  });

  // Recent jobs.
  router.get("/", async (_req, res) => {
    const jobs = await queue.getJobs(jobStates, 0, 20, true);
    const result = await Promise.all(
      jobs.map(async (job) => ({
        id: job.id,
        name: job.name,
        state: await job.getState(),
        attemptsMade: job.attemptsMade,
        failedReason: job.failedReason,
        data: job.data
      }))
    );

    res.json({ jobs: result });
  });

  // Job details.
  router.get("/:id", async (req, res) => {
    const job = await queue.getJob(req.params.id);

    if (!job) {
      res.status(404).json({ error: "job not found" });
      return;
    }

    res.json({
      id: job.id,
      name: job.name,
      state: await job.getState(),
      attemptsMade: job.attemptsMade,
      failedReason: job.failedReason,
      returnvalue: job.returnvalue,
      data: job.data
    });
  });

  return router;
}
