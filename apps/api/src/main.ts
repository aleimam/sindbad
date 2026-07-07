import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.enableCors();
  // Request validation uses Zod (see @sindbad/shared) via a ZodValidationPipe — added in Phase 1.

  const config = new DocumentBuilder()
    .setTitle('Sindbad API')
    .setDescription('The single backend API for Sindbad (web, admin, mobile).')
    .setVersion('0.0.1')
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, config));

  const port = process.env.API_PORT ? Number(process.env.API_PORT) : 3001;
  await app.listen(port);
  Logger.log(`Sindbad API ready at http://localhost:${port}/api`, 'Bootstrap');
}

void bootstrap();
