import type { Job } from "bullmq";
import { config } from "../shared/config.js";
import { logger } from "../shared/logger.js";
import {
  jobProcessingDurationSeconds,
  jobsFailedTotal,
  jobsProcessedTotal,
  jobsRetriedTotal,
  jobsSucceededTotal
} from "../shared/metrics.js";
import type { WebhookJob } from "../queue/types.js";

// Process one webhook delivery job.
export async function processWebhookJob(job: Job<WebhookJob>) {
  const stopTimer = jobProcessingDurationSeconds.startTimer();
  const attemptNumber = job.attemptsMade + 1;
  const maxAttempts = job.opts.attempts ?? config.JOB_ATTEMPTS;
  logger.info({ jobId: job.id, attempt: attemptNumber, data: job.data }, "processing job");

  try {
    await sleep(job.data.delayMs);

    if (job.data.shouldFail) {
      throw new Error("simulated webhook failure");
    }

    jobsProcessedTotal.inc({ result: "success" });
    jobsSucceededTotal.inc();
    return {
      delivered: true,
      targetUrl: job.data.targetUrl,
      eventType: job.data.eventType,
      processedAt: new Date().toISOString()
    };
  } catch (error) {
    jobsProcessedTotal.inc({ result: "failure" });
    if (attemptNumber < maxAttempts) {
      jobsRetriedTotal.inc();
    } else {
      jobsFailedTotal.inc();
    }
    throw error;
  } finally {
    stopTimer();
  }
}

// Local stand-in for network latency.
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
