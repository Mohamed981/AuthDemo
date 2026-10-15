import { Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

const REQUEST_ID_HEADER = 'x-request-id';
// Accept an upstream ID (e.g. from a load balancer) only if it looks sane.
const VALID_REQUEST_ID = /^[\w-]{1,64}$/;

const logger = new Logger('HTTP');

export function getRequestId(res: Response): string | undefined {
  return res.locals.requestId as string | undefined;
}

/**
 * Tags every request with an ID (echoed in the X-Request-Id response header
 * and in error bodies) and logs one access line per request when it finishes.
 * Registered as the first Express middleware in main.ts so it also covers
 * requests rejected by the body parser.
 */
export function requestContext(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.header(REQUEST_ID_HEADER);
  const requestId = incoming && VALID_REQUEST_ID.test(incoming) ? incoming : randomUUID();
  res.locals.requestId = requestId;
  res.setHeader(REQUEST_ID_HEADER, requestId);

  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    logger.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${ms.toFixed(1)}ms [${requestId}]`);
  });

  next();
}
