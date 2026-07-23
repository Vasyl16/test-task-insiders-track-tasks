import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';
import { extractExceptionMessage } from '@common/utils';

// Prisma error codes worth their own HTTP status + message rather than a
// generic 500 — this is the last-resort safety net for any unique-
// constraint/missing-record race that isn't already caught and given a
// specific message closer to its source (e.g. InvitesService's own P2002
// handling). Business logic should still prefer catching these locally
// where it can give a better message; this only guarantees a race that
// slips through never leaks a raw Prisma error or a bare 500.
const PRISMA_ERROR_RESPONSES: Partial<
  Record<string, { status: HttpStatus; message: string }>
> = {
  P2002: {
    status: HttpStatus.CONFLICT,
    message: 'This action conflicts with existing data',
  },
  P2025: {
    status: HttpStatus.NOT_FOUND,
    message: 'The requested resource was not found',
  },
};

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const prismaResponse =
      exception instanceof Prisma.PrismaClientKnownRequestError
        ? PRISMA_ERROR_RESPONSES[exception.code]
        : undefined;

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : (prismaResponse?.status ?? HttpStatus.INTERNAL_SERVER_ERROR);

    // Always a single string, regardless of which shape the underlying
    // exception used (ValidationPipe's own `message: string[]` for
    // multi-field validation failures vs. a hand-thrown exception's plain
    // string) — API consumers never have to branch on it.
    const message =
      exception instanceof HttpException
        ? extractExceptionMessage(exception)
        : (prismaResponse?.message ?? 'Internal server error');

    this.logger.error(
      `${request.method} ${request.url} ${status}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
    });
  }
}
