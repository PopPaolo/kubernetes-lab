import type { NextFunction, Request, Response } from "express";
import { httpRequestDurationSeconds, httpRequestsTotal } from "../../shared/metrics.js";

// Record request count and latency for each API request.
export function requestMetrics(req: Request, res: Response, next: NextFunction) {
  const stopTimer = httpRequestDurationSeconds.startTimer({
    method: req.method,
    route: req.path
  });

  res.on("finish", () => {
    stopTimer();
    httpRequestsTotal.inc({
      method: req.method,
      route: req.route?.path?.toString() ?? req.path,
      status_code: String(res.statusCode)
    });
  });

  next();
}
