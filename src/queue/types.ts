import { z } from "zod";

// Request schema for webhook jobs.
export const webhookJobSchema = z.object({
  targetUrl: z.string().url().default("https://example.invalid/webhook"),
  eventType: z.string().min(1).default("demo.event"),
  payload: z.record(z.string(), z.unknown()).default({ message: "fake webhook payload" }),
  shouldFail: z.boolean().default(false),
  delayMs: z.number().int().min(0).max(30000).default(0)
});

// Job payload passed from the API to the worker.
export type WebhookJob = z.infer<typeof webhookJobSchema>;

// States shown by the queue API.
export type JobState = "waiting" | "active" | "completed" | "failed" | "delayed";
