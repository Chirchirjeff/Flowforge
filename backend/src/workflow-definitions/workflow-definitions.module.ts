import { Module } from '@nestjs/common';
import { WorkflowDefinitionsService } from './workflow-definitions.service.js';
import { WorkflowDefinitionsController } from './workflow-definitions.controller.js';
import { AuditModule } from '../audit/audit.module.js';

@Module({
  imports: [AuditModule],
  providers: [WorkflowDefinitionsService],
  controllers: [WorkflowDefinitionsController],
  exports: [WorkflowDefinitionsService],
})
export class WorkflowDefinitionsModule {}
