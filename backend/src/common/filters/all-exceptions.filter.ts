import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { STATUS_CODES } from 'node:http';
import { getRequestId } from '../middleware/request-context.middleware';

interface ErrorBody {
  statusCode: number;
  message: string | string[];
  error: string;
  requestId?: string;
}

/**
 * Single place where every error leaving the API is shaped and logged.
 * Client errors (4xx) are logged as warnings without stack traces; anything
 * else is an unexpected failure, logged with its stack and returned as a
 * generic 500 so internals never leak to the client.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();
    const requestId = getRequestId(res);
    const body = { ...toErrorBody(exception), requestId };
    const where = `${req.method} ${req.originalUrl} [${requestId}]`;

    if (body.statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${where} -> ${body.statusCode}: ${describe(exception)}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else {
      this.logger.warn(`${where} -> ${body.statusCode}: ${formatMessage(body.message)}`);
    }

    if (res.headersSent) {
      res.end();
      return;
    }
    res.status(body.statusCode).json(body);
  }
}

function toErrorBody(exception: unknown): ErrorBody {
  if (exception instanceof HttpException) {
    const status = exception.getStatus();
    const response = exception.getResponse();
    if (typeof response === 'string') {
      return { statusCode: status, message: response, error: statusText(status) };
    }
    const { message, error } = response as Partial<ErrorBody>;
    return {
      statusCode: status,
      message: message ?? exception.message,
      error: error ?? statusText(status),
    };
  }

  // Express middleware errors (e.g. body-parser's 413) carry a 4xx status via
  // http-errors. Nest already converts invalid-JSON SyntaxErrors into a 400.
  const status = httpErrorStatus(exception);
  if (status) {
    return status === HttpStatus.PAYLOAD_TOO_LARGE
      ? { statusCode: status, message: 'Request body too large', error: 'Payload Too Large' }
      : { statusCode: status, message: 'Malformed request', error: 'Bad Request' };
  }

  return {
    statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    message: 'Internal server error',
    error: 'Internal Server Error',
  };
}

function httpErrorStatus(exception: unknown): number | undefined {
  if (typeof exception !== 'object' || exception === null) return undefined;
  const { status, expose } = exception as { status?: unknown; expose?: unknown };
  return typeof status === 'number' && status >= 400 && status < 500 && expose === true
    ? status
    : undefined;
}

/** HTTP reason phrase, e.g. 401 -> "Unauthorized", rather than an exception class name. */
function statusText(status: number): string {
  return STATUS_CODES[status] ?? 'Error';
}

function describe(exception: unknown): string {
  if (exception instanceof Error) return `${exception.name}: ${exception.message}`;
  return String(exception);
}

function formatMessage(message: string | string[]): string {
  return Array.isArray(message) ? message.join('; ') : message;
}
