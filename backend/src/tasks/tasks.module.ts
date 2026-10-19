import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service.js';
import { TasksController } from './tasks.controller.js';
import { WorkflowEngineModule } from '../workflow-engine/workflow-engine.module.js';
import { AuditModule } from '../audit/audit.module.js';

@Module({
  imports: [WorkflowEngineModule, AuditModule],
  providers: [TasksService],
  controllers: [TasksController],
  exports: [TasksService],
})
export class TasksModule {}
