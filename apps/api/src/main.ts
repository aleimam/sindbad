import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

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
