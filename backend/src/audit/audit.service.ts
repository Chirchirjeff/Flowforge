import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

interface AuditEventDto {
  actorId?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  caseId?: string;
  correlationId?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  /** Append an immutable audit event. Never throws — audit failure must not block operations. */
  async record(dto: AuditEventDto): Promise<void> {
    try {
      await this.prisma.auditEvent.create({
        data: {
          actorId: dto.actorId ?? null,
          action: dto.action,
          entityType: dto.entityType ?? null,
          entityId: dto.entityId ?? null,
          caseId: dto.caseId ?? null,
          correlationId: dto.correlationId ?? null,
          metadata: (dto.metadata ?? {}) as object,
        },
      });
    } catch {
      // Log but never rethrow — audit must be non-blocking
      console.error('[Audit] Failed to record event:', dto.action);
    }
  }

  async query(opts: {
    actorId?: string;
    entityType?: string;
    entityId?: string;
    caseId?: string;
    action?: string;
    from?: string;
    to?: string;
    page?: number;
    pageSize?: number;
  }) {
    const page = opts.page ?? 1;
    const pageSize = Math.min(opts.pageSize ?? 50, 200);
    const skip = (page - 1) * pageSize;

    const where = {
      actorId: opts.actorId ?? undefined,
      entityType: opts.entityType ?? undefined,
      entityId: opts.entityId ?? undefined,
      caseId: opts.caseId ?? undefined,
      action: opts.action ? { contains: opts.action } : undefined,
      occurredAt: {
        gte: opts.from ? new Date(opts.from) : undefined,
        lte: opts.to ? new Date(opts.to) : undefined,
      },
    };

    const [total, events] = await this.prisma.$transaction([
      this.prisma.auditEvent.count({ where }),
      this.prisma.auditEvent.findMany({
        where,
        include: { actor: { select: { id: true, firstName: true, lastName: true, email: true } } },
        orderBy: { occurredAt: 'desc' },
        skip,
        take: pageSize,
      }),
    ]);

    return { total, page, pageSize, events };
  }
}
