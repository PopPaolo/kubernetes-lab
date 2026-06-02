import type { Queue } from "bullmq";
import type { WebhookJob } from "../../queue/types.js";

// Shared route type for the BullMQ queue.
export type WebhookQueue = Queue<WebhookJob, unknown, string>;
