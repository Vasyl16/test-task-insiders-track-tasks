import { ArgumentsHost, Catch, HttpException } from '@nestjs/common';
import { BaseWsExceptionFilter } from '@nestjs/websockets';
import { extractExceptionMessage } from '@common/utils';

// AllExceptionsFilter only ever handles the HTTP context (it calls
// host.switchToHttp() unconditionally) — an exception thrown from a
// WebSocket message handler's own pipe/guard layer (a ValidationPipe
// failure on @MessageBody(), in particular, which throws before the
// handler body — and therefore its own try/catch — ever runs) would hit
// that filter, which would itself throw trying to read an HTTP
// request/response that doesn't exist in a WS context. This filter is the
// WS-context counterpart, applied via @UseFilters() on RealtimeGateway.
//
// Only HttpException (what ValidationPipe/guards throw) is special-cased,
// to preserve its real message via the same extractExceptionMessage
// AllExceptionsFilter uses — everything else (an actual thrown WsException,
// or a genuinely unknown error) is left to BaseWsExceptionFilter's own
// already-correct handling (emits 'exception' to the client, logs unknown
// errors).
@Catch()
export class WsExceptionFilter extends BaseWsExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    if (exception instanceof HttpException) {
      const client = host.switchToWs().getClient<{
        emit: (event: string, payload: unknown) => void;
      }>();
      client.emit('exception', {
        status: 'error',
        message: extractExceptionMessage(exception),
      });
      return;
    }

    super.catch(exception, host);
  }
}
