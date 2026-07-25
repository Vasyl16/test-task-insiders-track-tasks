import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';

// Logs every HTTP request: method, URL, final status code, duration in ms.
// Registered globally (APP_INTERCEPTOR in AppModule), same pattern as
// AllExceptionsFilter's APP_FILTER registration.
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    // WS message handlers (RealtimeGateway) also pass through global
    // interceptors - switchToHttp()'s getResponse() is meaningless there, so
    // skip anything that isn't a real HTTP request.
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const start = Date.now();

    // 'finish' fires once Express has fully sent the response - by then
    // response.statusCode is guaranteed final, including for error
    // responses (AllExceptionsFilter sets it *after* this interceptor's
    // handler would otherwise see the request, since filters run outside
    // the interceptor chain). Logging here instead of via the observable's
    // success/error callbacks sidesteps having to duplicate that
    // status-resolution logic.
    response.on('finish', () => {
      const durationMs = Date.now() - start;
      this.logger.log(
        `${request.method} ${request.originalUrl} ${response.statusCode} ${durationMs}ms`,
      );
    });

    return next.handle();
  }
}
