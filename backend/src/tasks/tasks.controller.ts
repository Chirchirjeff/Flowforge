import {
  Controller, Get, Post, Param, Body, Query,
  UseGuards, BadRequestException, Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../common/guards/permissions.guard.js';
import { RequirePermissions } from '../common/decorators/permissions.decorator.js';
import { TasksService } from './tasks.service.js';

@Controller('tasks')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  /** GET /tasks/my — inbox */
  @Get('my')
  @RequirePermissions('task.complete')
  myInbox(
    @Request() req: { user: { id: string } },
    @Query() q: Record<string, string>,
  ) {
    return this.tasks.myInbox(req.user.id, {
      status: q['status'],
      page: q['page'] ? parseInt(q['page']) : undefined,
      pageSize: q['pageSize'] ? parseInt(q['pageSize']) : undefined,
    });
  }

  @Get(':id')
  @RequirePermissions('task.complete')
  get(@Param('id') id: string) { return this.tasks.get(id); }

  /** POST /tasks/:id/claim */
  @Post(':id/claim')
  @RequirePermissions('task.claim')
  claim(@Param('id') id: string, @Request() req: { user: { id: string } }) {
    return this.tasks.claim(id, req.user.id);
  }

  /** POST /tasks/:id/complete */
  @Post(':id/complete')
  @RequirePermissions('task.complete')
  complete(
    @Param('id') id: string,
    @Body() body: unknown,
    @Request() req: { user: { id: string } },
  ) {
    const b = body as Record<string, unknown>;
    if (!b['action']) throw new BadRequestException('action is required (approve|reject|submit|request_changes)');
    return this.tasks.complete({
      taskId: id,
      actorId: req.user.id,
      action: String(b['action']),
      formData: b['formData'] as Record<string, unknown> | undefined,
      comment: b['comment'] ? String(b['comment']) : undefined,
    });
  }

  /** POST /tasks/:id/reassign */
  @Post(':id/reassign')
  @RequirePermissions('task.reassign')
  reassign(
    @Param('id') id: string,
    @Body() body: unknown,
    @Request() req: { user: { id: string } },
  ) {
    const b = body as Record<string, unknown>;
    if (!b['assignToId']) throw new BadRequestException('assignToId required');
    return this.tasks.reassign(
      id,
      req.user.id,
      String(b['assignToId']),
      b['reason'] ? String(b['reason']) : undefined,
    );
  }
}
