import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../common/guards/permissions.guard.js';
import { RequirePermissions } from '../common/decorators/permissions.decorator.js';
import { AuditService } from './audit.service.js';

@Controller('audit-events')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('audit.read')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  query(@Query() q: Record<string, string>) {
    return this.audit.query({
      actorId: q['actorId'],
      entityType: q['entityType'],
      entityId: q['entityId'],
      caseId: q['caseId'],
      action: q['action'],
      from: q['from'],
      to: q['to'],
      page: q['page'] ? parseInt(q['page']) : undefined,
      pageSize: q['pageSize'] ? parseInt(q['pageSize']) : undefined,
    });
  }
}
