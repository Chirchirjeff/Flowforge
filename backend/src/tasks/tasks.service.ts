import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { WorkflowEngineService } from '../workflow-engine/workflow-engine.service.js';
import { AuditService } from '../audit/audit.service.js';

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly engine: WorkflowEngineService,
    private readonly audit: AuditService,
  ) {}

  /** My inbox — tasks assigned to me or to my roles */
  async myInbox(userId: string, opts: { status?: string; page?: number; pageSize?: number }) {
    const page = opts.page ?? 1;
    const pageSize = Math.min(opts.pageSize ?? 20, 100);

    // Get user's role names
    const userWithRoles = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { userRoles: { include: { role: true } } },
    });
    const roleNames = userWithRoles?.userRoles.map((ur: { role: { name: string } }) => ur.role.name) ?? [];

    const where = {
      status: opts.status ? (opts.status as never) : { in: ['PENDING', 'IN_PROGRESS'] as never[] },
      OR: [
        { assignedToId: userId },
        { assignedRole: { in: roleNames } },
      ],
    };

    const [total, tasks] = await this.prisma.$transaction([
      this.prisma.task.count({ where }),
      this.prisma.task.findMany({
        where,
        include: {
          case: { select: { id: true, caseNumber: true, title: true, status: true } },
          assignedTo: { select: { id: true, firstName: true, lastName: true } },
          instance: {
            include: { version: { include: { definition: true } } },
          },
        },
        orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return { total, page, pageSize, tasks };
  }

  async get(id: string) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: {
        case: true,
        assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } },
        instance: { include: { version: { include: { definition: true } } } },
      },
    });
    if (!task) throw new NotFoundException(`Task ${id} not found`);
    return task;
  }

  /** Claim an unassigned group task */
  async claim(taskId: string, userId: string) {
    const task = await this.get(taskId);
    if (task.status !== 'PENDING') throw new BadRequestException('Task is not claimable');
    if (task.assignedToId) throw new BadRequestException('Task already assigned to a user');

    const updated = await this.prisma.task.update({
      where: { id: taskId },
      data: { assignedToId: userId, status: 'IN_PROGRESS' },
    });

    await this.audit.record({
      actorId: userId,
      action: 'task.claimed',
      entityType: 'Task',
      entityId: taskId,
      caseId: task.caseId,
    });
    return updated;
  }

  /** Complete with an action (approve/reject/submit/request_changes) */
  async complete(dto: {
    taskId: string;
    actorId: string;
    action: string;
    formData?: Record<string, unknown>;
    comment?: string;
  }) {
    const task = await this.get(dto.taskId);
    if (!['PENDING', 'IN_PROGRESS'].includes(task.status)) {
      throw new BadRequestException('Task is not actionable');
    }
    if (task.assignedToId && task.assignedToId !== dto.actorId) {
      throw new ForbiddenException('You are not assigned to this task');
    }

    await this.engine.completeTask({
      taskId: dto.taskId,
      actorId: dto.actorId,
      action: dto.action,
      formData: dto.formData,
      comment: dto.comment,
    });

    return this.get(dto.taskId);
  }

  /** Reassign task to another user */
  async reassign(taskId: string, actorId: string, assignToId: string, reason?: string) {
    const task = await this.get(taskId);
    if (!['PENDING', 'IN_PROGRESS'].includes(task.status)) {
      throw new BadRequestException('Cannot reassign a completed task');
    }

    const target = await this.prisma.user.findUnique({ where: { id: assignToId } });
    if (!target) throw new NotFoundException(`User ${assignToId} not found`);

    const updated = await this.prisma.task.update({
      where: { id: taskId },
      data: { assignedToId: assignToId, status: 'IN_PROGRESS' },
    });

    await this.audit.record({
      actorId,
      action: 'task.reassigned',
      entityType: 'Task',
      entityId: taskId,
      caseId: task.caseId,
      metadata: { assignedTo: assignToId, reason },
    });

    return updated;
  }
}
