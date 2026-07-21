import { IoAdapter } from '@nestjs/platform-socket.io';
import type { INestApplicationContext } from '@nestjs/common';
import type { ServerOptions } from 'socket.io';

// @WebSocketGateway()'s own `cors` option is evaluated at class-definition
// time, before Nest's DI has run — it can't read the injected ConfigService
// the way app.enableCors() does for the REST API. This adapter is the one
// place that CAN, since it's constructed in main.ts after the app (and its
// ConfigService) already exist.
export class SocketIoAdapter extends IoAdapter {
  constructor(
    app: INestApplicationContext,
    private readonly corsOrigin: string,
  ) {
    super(app);
  }

  createIOServer(port: number, options?: ServerOptions): unknown {
    return super.createIOServer(port, {
      ...options,
      cors: { origin: this.corsOrigin, credentials: true },
    });
  }
}
