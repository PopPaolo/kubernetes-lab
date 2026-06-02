import pino from "pino";
import { config } from "./config.js";

// Shared logger.
export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  base: {
    service: process.env.SERVICE_NAME ?? "webhook-queue-lab",
    version: config.APP_VERSION
  }
});
