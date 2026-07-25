import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppConfig } from '@config/config.types';
import { SocketIoAdapter } from '@modules/realtime/socket-io.adapter';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService<AppConfig, true>);
  const corsOrigin = configService.get('corsOrigin', { infer: true });

  // Helmet's default CSP blocks Swagger UI's inline <script>/<style> at
  // /api/docs - extending script-src/style-src rather than disabling CSP
  // outright keeps every other default (frame/sniffing/HSTS/etc.) in place.
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          ...helmet.contentSecurityPolicy.getDefaultDirectives(),
          'script-src': ["'self'", "'unsafe-inline'"],
          'style-src': ["'self'", "'unsafe-inline'"],
        },
      },
    }),
  );
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

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Task Tracker API')
    .setDescription(
      'Workspaces, projects, tasks, comments, and real-time updates.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, swaggerDocument);

  await app.listen(configService.get('port', { infer: true }));
}
bootstrap();
