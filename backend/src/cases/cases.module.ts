import { Module } from '@nestjs/common';
import { CasesService } from './cases.service.js';
import { CasesController } from './cases.controller.js';
import { WorkflowEngineModule } from '../workflow-engine/workflow-engine.module.js';
import { AuditModule } from '../audit/audit.module.js';

@Module({
  imports: [WorkflowEngineModule, AuditModule],
  providers: [CasesService],
  controllers: [CasesController],
  exports: [CasesService],
})
export class CasesModule {}
