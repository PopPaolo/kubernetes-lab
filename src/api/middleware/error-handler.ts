import type { NextFunction, Request, Response } from "express";
import { logger } from "../../shared/logger.js";

// Last Express handler for route errors.
export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  logger.error({ error }, "request failed");
  res.status(400).json({
    error: error instanceof Error ? error.message : "unknown error"
  });
}
