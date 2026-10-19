import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';

@Injectable()
export class WorkflowDefinitionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ── Definitions ─────────────────────────────────────────────────────────────

  async listDefinitions() {
    return this.prisma.workflowDefinition.findMany({
      include: {
        versions: { orderBy: { version: 'desc' }, take: 1 },
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getDefinition(id: string) {
    const def = await this.prisma.workflowDefinition.findUnique({
      where: { id },
      include: {
        versions: { orderBy: { version: 'desc' } },
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
    if (!def) throw new NotFoundException(`Workflow definition ${id} not found`);
    return def;
  }

  async createDefinition(dto: { name: string; description?: string; createdById: string }) {
    const def = await this.prisma.workflowDefinition.create({
      data: { name: dto.name, description: dto.description, createdById: dto.createdById },
    });
    // Auto-create an initial draft version
    await this.prisma.workflowVersion.create({
      data: {
        definitionId: def.id,
        version: 1,
        status: 'DRAFT',
        graph: { nodes: [], edges: [] },
      },
    });
    await this.audit.record({
      actorId: dto.createdById,
      action: 'workflow.created',
      entityType: 'WorkflowDefinition',
      entityId: def.id,
      metadata: { name: dto.name },
    });
    return this.getDefinition(def.id);
  }

  async updateDefinition(id: string, dto: { name?: string; description?: string }) {
    await this.getDefinition(id);
    return this.prisma.workflowDefinition.update({ where: { id }, data: dto });
  }

  // ── Versions ─────────────────────────────────────────────────────────────────

  async getVersion(versionId: string) {
    const v = await this.prisma.workflowVersion.findUnique({ where: { id: versionId } });
    if (!v) throw new NotFoundException(`Version ${versionId} not found`);
    return v;
  }

  async saveGraph(
    versionId: string,
    graph: { nodes: unknown[]; edges: unknown[] },
    actorId: string,
  ) {
    const v = await this.getVersion(versionId);
    if (v.status === 'PUBLISHED') {
      throw new ForbiddenException('Cannot edit a published version. Create a new version first.');
    }
    return this.prisma.workflowVersion.update({ where: { id: versionId }, data: { graph: graph as object } });
  }

  async publishVersion(versionId: string, actorId: string) {
    const v = await this.getVersion(versionId);
    if (v.status === 'PUBLISHED') throw new BadRequestException('Already published');

    const graph = v.graph as { nodes: unknown[]; edges: unknown[] };
    const errors = this.validateGraph(graph);
    if (errors.length) throw new BadRequestException(errors);

    const published = await this.prisma.workflowVersion.update({
      where: { id: versionId },
      data: { status: 'PUBLISHED', publishedAt: new Date() },
    });
    await this.audit.record({
      actorId,
      action: 'workflow.published',
      entityType: 'WorkflowVersion',
      entityId: versionId,
      metadata: { definitionId: v.definitionId, version: v.version },
    });
    return published;
  }

  async createNewVersion(definitionId: string, actorId: string) {
    const def = await this.getDefinition(definitionId);
    const latest = def.versions[0];
    const nextVersion = latest ? latest.version + 1 : 1;
    // Copy graph from latest version
    const graph = latest ? latest.graph : { nodes: [], edges: [] };
    return this.prisma.workflowVersion.create({
      data: {
        definitionId,
        version: nextVersion,
        status: 'DRAFT',
        graph: graph as object,
      },
    });
  }

  // ── Validation ────────────────────────────────────────────────────────────────

  validateGraph(graph: { nodes: unknown[]; edges: unknown[] }) {
    const nodes = (Array.isArray(graph.nodes) ? graph.nodes : []) as Array<{
      id: string; type: string; config?: Record<string, unknown>;
    }>;
    const edges = (Array.isArray(graph.edges) ? graph.edges : []) as Array<{
      id?: string; source: string; target: string; sourceHandle?: string | null;
    }>;
    const errors: string[] = [];
    const supportedTypes = new Set(['start', 'end', 'user-task', 'approval', 'condition', 'return', 'notification', 'automated-task', 'label']);
    for (const node of nodes) {
      if (!supportedTypes.has(node.type)) errors.push(`Node “${node.id}” uses unsupported type “${node.type}”.`);
    }
    const startNodes = nodes.filter((n) => n.type === 'start');
    const endNodes = nodes.filter((n) => n.type === 'end');
    if (startNodes.length !== 1) errors.push('Workflow must have exactly one Start node.');
    if (endNodes.length < 1) errors.push('Workflow must have at least one End node.');
    if (nodes.length < 2) errors.push('Workflow must have at least 2 nodes.');

    const ids = new Set(nodes.map((node) => node.id));
    const outgoing = new Map<string, typeof edges>();
    for (const edge of edges) {
      if (!ids.has(edge.source)) errors.push(`Connection references missing source node “${edge.source}”.`);
      if (!ids.has(edge.target)) errors.push(`Connection references missing target node “${edge.target}”.`);
      outgoing.set(edge.source, [...(outgoing.get(edge.source) ?? []), edge]);
    }

    for (const node of nodes) {
      const config = node.config ?? {};
      if (['user-task', 'approval'].includes(node.type) && !String(config['title'] ?? '').trim()) {
        errors.push(`${node.type === 'approval' ? 'Approval' : 'Task'} node “${node.id}” needs a title.`);
      }
      if (['user-task', 'approval'].includes(node.type) && ['role', 'user'].includes(String(config['assignmentType'] ?? 'role')) && !String(config['assignmentValue'] ?? '').trim()) {
        errors.push(`${node.type === 'approval' ? 'Approval' : 'Task'} node “${node.id}” needs an assignee.`);
      }
      if (node.type === 'condition' && !String(config['field'] ?? '').trim()) {
        errors.push(`Decision node “${node.id}” needs a field to evaluate.`);
      }
      const routes = outgoing.get(node.id) ?? [];
      if (node.type !== 'end' && node.type !== 'label' && routes.length === 0) errors.push(`Node “${node.id}” has no outgoing connection.`);
      if (node.type === 'condition' && routes.length && (!routes.some((e) => e.sourceHandle === 'true') || !routes.some((e) => e.sourceHandle === 'false'))) {
        errors.push(`Decision node “${node.id}” needs both Yes and No routes connected.`);
      }
      if (node.type === 'approval' && routes.length && (!routes.some((e) => e.sourceHandle === 'approved') || !routes.some((e) => e.sourceHandle === 'rejected'))) {
        errors.push(`Approval node “${node.id}” needs Approved and Rejected routes connected.`);
      }
    }

    if (startNodes.length === 1) {
      const visited = new Set<string>();
      const queue = [startNodes[0].id];
      while (queue.length) {
        const id = queue.shift()!;
        if (visited.has(id)) continue;
        visited.add(id);
        for (const edge of outgoing.get(id) ?? []) if (ids.has(edge.target)) queue.push(edge.target);
      }
      for (const node of nodes) if (node.type !== 'label' && !visited.has(node.id)) errors.push(`Node “${node.id}” is disconnected from Start.`);
      if (!endNodes.some((node) => visited.has(node.id))) errors.push('No End node is reachable from Start.');
    }
    return [...new Set(errors)];
  }
}
