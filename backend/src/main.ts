import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { RolesService } from './roles/roles.service.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      /^http:\/\/localhost:\d+$/,
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  app.setGlobalPrefix('api/v1');

  // Seed default roles & permissions on startup (idempotent)
  const roles = app.get(RolesService);
  await roles.seedDefaultRoles();

  const port = process.env['PORT'] ?? 4000;
  await app.listen(port);
  console.log(`FlowForge API running on http://localhost:${port}/api/v1`);
}

bootstrap();
