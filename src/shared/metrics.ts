import client from "prom-client";
import { config } from "./config.js";

// App metrics registry.
export const registry = new client.Registry();

// Node.js process metrics.
client.collectDefaultMetrics({
  register: registry,
  prefix: "webhook_queue_",
  labels: {
    app_version: config.APP_VERSION
  }
});

// API request count.
export const httpRequestsTotal = new client.Counter({
  name: "webhook_queue_http_requests_total",
  help: "HTTP requests handled by the API.",
  labelNames: ["method", "route", "status_code"],
  registers: [registry]
});

// API request latency.
export const httpRequestDurationSeconds = new client.Histogram({
  name: "webhook_queue_http_request_duration_seconds",
  help: "HTTP request duration in seconds.",
  labelNames: ["method", "route"],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
  registers: [registry]
});

// Jobs accepted by the API.
export const jobsEnqueuedTotal = new client.Counter({
  name: "webhook_queue_jobs_enqueued_total",
  help: "Jobs successfully enqueued.",
  registers: [registry]
});

export const enqueueFailuresTotal = new client.Counter({
  name: "webhook_queue_enqueue_failures_total",
  help: "Job enqueue failures.",
  registers: [registry]
});

// Worker job attempts by result.
export const jobsProcessedTotal = new client.Counter({
  name: "webhook_queue_jobs_processed_total",
  help: "Jobs processed by workers.",
  labelNames: ["result"],
  registers: [registry]
});

// Worker job totals.
export const jobsSucceededTotal = new client.Counter({
  name: "webhook_queue_jobs_succeeded_total",
  help: "Jobs successfully completed by workers.",
  registers: [registry]
});

export const jobsFailedTotal = new client.Counter({
  name: "webhook_queue_jobs_failed_total",
  help: "Jobs that reached their final failed state.",
  registers: [registry]
});

export const jobsRetriedTotal = new client.Counter({
  name: "webhook_queue_jobs_retried_total",
  help: "Job attempts that failed and were eligible for retry.",
  registers: [registry]
});

// Worker processing latency.
export const jobProcessingDurationSeconds = new client.Histogram({
  name: "webhook_queue_job_processing_duration_seconds",
  help: "Worker job processing duration in seconds.",
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10, 30],
  registers: [registry]
});

// Redis health.
export const redisConnected = new client.Gauge({
  name: "webhook_queue_redis_connected",
  help: "Redis connectivity status: 1 connected, 0 disconnected.",
  registers: [registry]
});

export const queueDepth = new client.Gauge({
  name: "webhook_queue_depth",
  help: "Queue job counts by state.",
  labelNames: ["state"],
  registers: [registry]
});

// Worker run state.
export const workerActive = new client.Gauge({
  name: "webhook_queue_worker_active",
  help: "Worker processing state: 1 running, 0 stopped.",
  registers: [registry]
});
