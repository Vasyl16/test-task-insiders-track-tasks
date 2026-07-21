import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '@config/config.types';
import { SocketIoAdapter } from '@modules/realtime/socket-io.adapter';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService<AppConfig, true>);
  const corsOrigin = configService.get('corsOrigin', { infer: true });

  app.enableCors({ origin: corsOrigin });
  app.useWebSocketAdapter(new SocketIoAdapter(app, corsOrigin));
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(configService.get('port', { infer: true }));
}
bootstrap();
