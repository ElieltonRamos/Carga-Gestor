/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { version } from '../package.json';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors();
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const appEnvKeys = [
    'PORT',
    'ENVIRONMENT',
    'DATABASE_URL',
    'DATABASE_USER',
    'DATABASE_PASSWORD',
    'DATABASE_NAME',
    'DATABASE_HOST',
    'DATABASE_PORT',
    'JWT_SECRET',
    'LICENSE_PUBLIC_KEY',
    'LICENSING_SERVER',
  ];

  console.log('=== Environment Variables ===');
  appEnvKeys.forEach((key) => {
    const value = process.env[key];
    const isSensitive = ['PASSWORD', 'SECRET', 'TOKEN', 'KEY', 'URL'].some(
      (s) => key.includes(s),
    );
    console.log(
      `${key}:`,
      value ? (isSensitive ? '***' : value) : 'nao-identificado',
    );
  });
  console.log(
    'PM2 instance:',
    process.env.NODE_APP_INSTANCE ?? 'nao-identificado',
  );
  console.log(`VERSAO SERVIDOR = ${version}`);
  console.log('=============================');

  if (process.env.ENVIRONMENT !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('WMS Server')
      .setDescription(
        'API de gestão de cargas, romaneios e conferência de carregamento',
      )
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    SwaggerModule.setup(
      'swagger',
      app,
      SwaggerModule.createDocument(app, config),
    );
  }

  await app.listen(process.env.PORT ?? 3003);
}
void bootstrap();
