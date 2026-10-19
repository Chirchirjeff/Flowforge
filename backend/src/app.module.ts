import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { RolesModule } from './roles/roles.module.js';
import { AuditModule } from './audit/audit.module.js';
import { WorkflowDefinitionsModule } from './workflow-definitions/workflow-definitions.module.js';
import { WorkflowEngineModule } from './workflow-engine/workflow-engine.module.js';
import { CasesModule } from './cases/cases.module.js';
import { TasksModule } from './tasks/tasks.module.js';
import { AppController } from './app.controller.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    PrismaModule,
    AuthModule,
    UsersModule,
    RolesModule,
    AuditModule,
    WorkflowDefinitionsModule,
    WorkflowEngineModule,
    CasesModule,
    TasksModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
