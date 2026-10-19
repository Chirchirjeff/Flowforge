import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { WorkflowEngineService } from '../workflow-engine/workflow-engine.service.js';
import { AuditService } from '../audit/audit.service.js';

@Injectable()
export class CasesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly engine: WorkflowEngineService,
    private readonly audit: AuditService,
  ) {}

  private async generateCaseNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.case.count();
    return `FF-${year}-${String(count + 1).padStart(6, '0')}`;
  }

  async list(userId: string, opts: { status?: string; page?: number; pageSize?: number }) {
    const page = opts.page ?? 1;
    const pageSize = Math.min(opts.pageSize ?? 20, 100);
    const where = {
      status: opts.status ? (opts.status as never) : undefined,
    };
    const [total, cases] = await this.prisma.$transaction([
      this.prisma.case.count({ where }),
      this.prisma.case.findMany({
        where,
        include: {
          createdBy: { select: { id: true, firstName: true, lastName: true } },
          workflowInstance: {
            include: { version: { include: { definition: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return { total, page, pageSize, cases };
  }

  async get(id: string) {
    const c = await this.prisma.case.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        workflowInstance: {
          include: {
            version: { include: { definition: true } },
            events: { orderBy: { occurredAt: 'asc' } },
            tasks: {
              include: {
                assignedTo: { select: { id: true, firstName: true, lastName: true } },
              },
              orderBy: { createdAt: 'desc' },
            },
          },
        },
      },
    });
    if (!c) throw new NotFoundException(`Case ${id} not found`);
    return c;
  }

  async create(dto: {
    title: string;
    description?: string;
    workflowVersionId: string;
    createdById: string;
    metadata?: Record<string, unknown>;
  }) {
    const version = await this.prisma.workflowVersion.findUnique({
      where: { id: dto.workflowVersionId },
    });
    if (!version) throw new NotFoundException(`Workflow version ${dto.workflowVersionId} not found`);
    if (version.status !== 'PUBLISHED') {
      throw new BadRequestException('Can only create cases from published workflow versions');
    }

    const caseNumber = await this.generateCaseNumber();

    const newCase = await this.prisma.case.create({
      data: {
        caseNumber,
        title: dto.title,
        description: dto.description,
        createdById: dto.createdById,
        workflowVersionId: dto.workflowVersionId,
        status: 'OPEN',
        metadata: (dto.metadata ?? {}) as object,
      },
    });

    await this.audit.record({
      actorId: dto.createdById,
      action: 'case.created',
      entityType: 'Case',
      entityId: newCase.id,
      caseId: newCase.id,
      metadata: { title: dto.title, caseNumber },
    });

    // Start the workflow instance
    await this.engine.startInstance({
      versionId: dto.workflowVersionId,
      caseId: newCase.id,
      actorId: dto.createdById,
    });

    await this.prisma.case.update({
      where: { id: newCase.id },
      data: { status: 'IN_PROGRESS' },
    });

    return this.get(newCase.id);
  }

  async cancel(id: string, actorId: string, reason?: string) {
    const c = await this.get(id);
    if (['CLOSED', 'CANCELLED'].includes(c.status)) {
      throw new BadRequestException('Case is already closed or cancelled');
    }

    await this.prisma.$transaction([
      this.prisma.case.update({
        where: { id },
        data: { status: 'CANCELLED', closedAt: new Date() },
      }),
      // Cancel pending tasks
      this.prisma.task.updateMany({
        where: { caseId: id, status: { in: ['PENDING', 'IN_PROGRESS'] } },
        data: { status: 'CANCELLED' },
      }),
      // Cancel the instance
      this.prisma.workflowInstance.updateMany({
        where: { caseId: id, status: { notIn: ['COMPLETED', 'FAILED', 'CANCELLED'] } },
        data: { status: 'CANCELLED', finishedAt: new Date() },
      }),
    ]);

    await this.audit.record({
      actorId,
      action: 'case.cancelled',
      entityType: 'Case',
      entityId: id,
      caseId: id,
      metadata: { reason },
    });

    return this.get(id);
  }

  async timeline(id: string) {
    await this.get(id); // verify exists
    const events = await this.prisma.workflowEvent.findMany({
      where: { instance: { caseId: id } },
      orderBy: { occurredAt: 'asc' },
    });
    const auditEvents = await this.prisma.auditEvent.findMany({
      where: { caseId: id },
      include: { actor: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { occurredAt: 'asc' },
    });
    return { workflowEvents: events, auditEvents };
  }
}
