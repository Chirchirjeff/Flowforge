import {
  Controller, Get, Post, Param, Body, Query,
  UseGuards, BadRequestException, Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../common/guards/permissions.guard.js';
import { RequirePermissions } from '../common/decorators/permissions.decorator.js';
import { CasesService } from './cases.service.js';

@Controller('cases')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CasesController {
  constructor(private readonly cases: CasesService) {}

  @Get()
  @RequirePermissions('case.read')
  list(
    @Request() req: { user: { id: string } },
    @Query() q: Record<string, string>,
  ) {
    return this.cases.list(req.user.id, {
      status: q['status'],
      page: q['page'] ? parseInt(q['page']) : undefined,
      pageSize: q['pageSize'] ? parseInt(q['pageSize']) : undefined,
    });
  }

  @Get(':id')
  @RequirePermissions('case.read')
  get(@Param('id') id: string) { return this.cases.get(id); }

  @Get(':id/timeline')
  @RequirePermissions('case.read')
  timeline(@Param('id') id: string) { return this.cases.timeline(id); }

  @Post()
  @RequirePermissions('case.create')
  create(@Body() body: unknown, @Request() req: { user: { id: string } }) {
    const b = body as Record<string, unknown>;
    if (!b['title'] || !b['workflowVersionId']) {
      throw new BadRequestException('title and workflowVersionId are required');
    }
    return this.cases.create({
      title: String(b['title']),
      description: b['description'] ? String(b['description']) : undefined,
      workflowVersionId: String(b['workflowVersionId']),
      createdById: req.user.id,
      metadata: b['metadata'] as Record<string, unknown> | undefined,
    });
  }

  @Post(':id/cancel')
  @RequirePermissions('case.cancel')
  cancel(
    @Param('id') id: string,
    @Body() body: unknown,
    @Request() req: { user: { id: string } },
  ) {
    const b = body as Record<string, unknown>;
    return this.cases.cancel(id, req.user.id, b['reason'] ? String(b['reason']) : undefined);
  }
}
