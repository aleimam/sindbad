import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { RedisIoAdapter } from './chat/redis-io.adapter';

async function bootstrap() {
  // rawBody: capture the unparsed body so payment-gateway webhook signatures can
  // be verified against the exact bytes the gateway sent.
  const app = await NestFactory.create(AppModule, { rawBody: true });
  const config = app.get(ConfigService);

  // Behind Traefik (and later Cloudflare), trust the proxy hop(s) so req.ip is the
  // real client IP — used by rate limiting. Bump TRUST_PROXY_HOPS to 2 once
  // Cloudflare proxying (orange cloud) is enabled.
  const hops = parseInt(process.env.TRUST_PROXY_HOPS ?? '1', 10);
  app.getHttpAdapter().getInstance().set('trust proxy', hops);

  // Chat scale-out: use the Redis Socket.IO adapter when REDIS_URL is configured.
  const redisUrl = config.get<string>('redisUrl');
  if (redisUrl) {
    const redisAdapter = new RedisIoAdapter(app);
    await redisAdapter.connectToRedis(redisUrl);
    app.useWebSocketAdapter(redisAdapter);
  }

  app.setGlobalPrefix('api');
  app.use(cookieParser());
  app.enableCors({
    origin: config.get<string[]>('corsOrigins'),
    credentials: true,
  });
  // Request validation uses the shared Zod schemas via ZodValidationPipe (per route).

  const swagger = new DocumentBuilder()
    .setTitle('Sindbad API')
    .setDescription('The single backend API for Sindbad (web, admin, mobile).')
    .setVersion('0.0.1')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, swagger));

  const port = config.get<number>('port') ?? 3001;
  await app.listen(port);
  Logger.log(`Sindbad API ready at http://localhost:${port}/api`, 'Bootstrap');
}

void bootstrap();
