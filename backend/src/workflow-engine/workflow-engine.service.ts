import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { v4 as uuidv4 } from 'uuid';

// ── Graph primitives ──────────────────────────────────────────────────────────

interface GraphNode {
  id: string;
  type: string;   // start | end | user-task | approval | condition | notification | automated-task
  config?: Record<string, unknown>;
  position?: { x: number; y: number };
}

interface GraphEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  condition?: {
    field: string;
    operator: 'equals' | 'not_equals' | 'gt' | 'lt' | 'contains';
    value: unknown;
  };
  label?: string;
}

interface Graph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

@Injectable()
export class WorkflowEngineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ── Start a workflow instance ─────────────────────────────────────────────

  async startInstance(dto: {
    versionId: string;
    caseId: string;
    actorId: string;
    variables?: Record<string, unknown>;
  }) {
    const version = await this.prisma.workflowVersion.findUnique({
      where: { id: dto.versionId },
    });
    if (!version) throw new NotFoundException(`Workflow version ${dto.versionId} not found`);
    if (version.status !== 'PUBLISHED') {
      throw new BadRequestException('Only published workflow versions can be started');
    }

    const graph = version.graph as unknown as Graph;
    const startNode = graph.nodes.find((n) => n.type === 'start');
    if (!startNode) throw new BadRequestException('Workflow has no start node');

    const instance = await this.prisma.workflowInstance.create({
      data: {
        versionId: dto.versionId,
        caseId: dto.caseId,
        status: 'RUNNING',
        currentNodeId: startNode.id,
        variables: { ...(dto.variables ?? {}), _initiatorId: dto.actorId } as object,
      },
    });

    await this.recordEvent(instance.id, startNode.id, 'instance.started', dto.actorId);

    // Immediately advance past the start node
    await this.advanceFromNode(instance.id, startNode.id, graph, { ...(dto.variables ?? {}), _initiatorId: dto.actorId }, dto.actorId);

    return this.prisma.workflowInstance.findUnique({ where: { id: instance.id } });
  }

  // ── Complete a task (approve/reject/submit) ───────────────────────────────

  async completeTask(dto: {
    taskId: string;
    actorId: string;
    action: string;           // 'approve' | 'reject' | 'submit' | 'request_changes'
    formData?: Record<string, unknown>;
    comment?: string;
  }) {
    const task = await this.prisma.task.findUnique({
      where: { id: dto.taskId },
      include: { instance: true },
    });
    if (!task) throw new NotFoundException(`Task ${dto.taskId} not found`);
    if (task.status !== 'PENDING' && task.status !== 'IN_PROGRESS') {
      throw new BadRequestException('Task is not in an actionable state');
    }
    if (task.assignedToId && task.assignedToId !== dto.actorId) {
      throw new ForbiddenException('Task is not assigned to you');
    }
    const version = await this.prisma.workflowVersion.findUnique({ where: { id: task.instance.versionId } });
    const graph = version?.graph as unknown as Graph | undefined;
    const taskNode = graph?.nodes.find((node) => node.id === task.nodeId);
    if (taskNode?.type === 'approval' && taskNode.config?.['allowComment'] === true && !dto.comment?.trim()) {
      throw new BadRequestException('A comment is required for this approval action');
    }

    // Merge submitted form data into instance variables
    const instance = task.instance;
    const currentVars = (instance.variables as Record<string, unknown>) ?? {};
    const newVars = { ...currentVars, ...dto.formData, _lastAction: dto.action };

    // Mark task complete in a transaction
    await this.prisma.$transaction([
      this.prisma.task.update({
        where: { id: dto.taskId },
        data: {
          status: dto.action === 'reject' ? 'REJECTED' : 'COMPLETED',
          formData: dto.formData as object ?? {},
          completedAt: new Date(),
        },
      }),
      this.prisma.workflowInstance.update({
        where: { id: instance.id },
        data: { variables: newVars as object },
      }),
    ]);

    await this.audit.record({
      actorId: dto.actorId,
      action: `task.${dto.action}`,
      entityType: 'Task',
      entityId: dto.taskId,
      caseId: task.caseId,
      metadata: { action: dto.action, comment: dto.comment },
    });

    // Advance the workflow
    await this.advanceFromNode(instance.id, task.nodeId, graph!, newVars, dto.actorId);
  }

  // ── Internal: advance execution ───────────────────────────────────────────

  private async advanceFromNode(
    instanceId: string,
    fromNodeId: string,
    graph: Graph,
    variables: Record<string, unknown>,
    actorId: string,
  ) {
    const outgoing = graph.edges.filter((e) => e.source === fromNodeId);
    if (outgoing.length === 0) {
      // No outgoing edges — check if we're at an end node
      const node = graph.nodes.find((n) => n.id === fromNodeId);
      if (node?.type === 'end') {
        await this.completeInstance(instanceId, actorId);
      }
      return;
    }

    // Evaluate conditions and pick eligible transitions
    const node = graph.nodes.find((n) => n.id === fromNodeId);
    let preferredHandle: string | undefined;
    if (node?.type === 'approval') {
      const action = String(variables['_lastAction'] ?? '').toLowerCase();
      preferredHandle = action === 'approve' ? 'approved'
        : action === 'request_changes' ? 'returned'
        : action === 'reject' ? 'rejected' : undefined;
    } else if (node?.type === 'condition') {
      const config = node.config ?? {};
      const condition = {
        field: String(config['field'] ?? ''),
        operator: String(config['operator'] ?? 'equals') as NonNullable<GraphEdge['condition']>['operator'],
        value: config['value'],
      };
      preferredHandle = this.evaluateCondition(condition, variables) ? 'true' : 'false';
    }
    const routed = preferredHandle
      ? outgoing.filter((edge) => edge.sourceHandle === preferredHandle)
      : outgoing;
    const eligible = routed.filter((e) => this.evaluateCondition(e.condition, variables));
    if (eligible.length === 0) {
      // All conditions false — stall instance
      await this.prisma.workflowInstance.update({
        where: { id: instanceId },
        data: { status: 'WAITING' },
      });
      return;
    }

    // Follow first eligible edge (extend to parallel later)
    const edge = eligible[0];
    const targetNode = graph.nodes.find((n) => n.id === edge.target);
    if (!targetNode) return;

    await this.prisma.workflowInstance.update({
      where: { id: instanceId },
      data: { currentNodeId: targetNode.id },
    });

    await this.recordEvent(instanceId, targetNode.id, 'transition.taken', actorId, {
      edgeId: edge.id,
      label: edge.label,
    });

    await this.executeNode(instanceId, targetNode, graph, variables, actorId);
  }

  private async executeNode(
    instanceId: string,
    node: GraphNode,
    graph: Graph,
    variables: Record<string, unknown>,
    actorId: string,
  ) {
    const instance = await this.prisma.workflowInstance.findUnique({
      where: { id: instanceId },
    });
    if (!instance) return;

    switch (node.type) {
      case 'start':
        // Passthrough — advance immediately
        await this.advanceFromNode(instanceId, node.id, graph, variables, actorId);
        break;

      case 'end':
        await this.completeInstance(instanceId, actorId);
        break;

      case 'user-task':
      case 'approval': {
        // Create a task record and wait
        const config = node.config ?? {};
        const assignmentType = String(config['assignmentType'] ?? 'role');
        const assignmentValue = String(config['assignmentValue'] ?? '');
        const assignedUser = assignmentType === 'user' && assignmentValue
          ? await this.prisma.user.findFirst({
              where: { OR: [{ id: assignmentValue }, { email: assignmentValue }] },
              select: { id: true },
            })
          : null;
        await this.prisma.task.create({
          data: {
            instanceId,
            caseId: instance.caseId!,
            nodeId: node.id,
            title: String(config['title'] ?? `${node.type} — ${node.id}`),
            description: config['description'] ? String(config['description']) : null,
            assignedToId: assignmentType === 'user'
              ? assignedUser?.id ?? null
              : assignmentType === 'initiator'
                ? String((instance.variables as Record<string, unknown>)['_initiatorId'] ?? '') || null
                : null,
            assignedRole: assignmentType === 'role' ? assignmentValue || null : null,
            priority: config['priority'] ? Number(config['priority']) : 0,
            dueAt: config['dueDays']
              ? new Date(Date.now() + Number(config['dueDays']) * 86400000)
              : null,
          },
        });
        await this.prisma.workflowInstance.update({
          where: { id: instanceId },
          data: { status: 'WAITING' },
        });
        await this.recordEvent(instanceId, node.id, 'task.created', actorId);
        break;
      }

      case 'condition':
        // The condition is evaluated by advanceFromNode and chooses true/false output.
        await this.advanceFromNode(instanceId, node.id, graph, variables, actorId);
        break;

      case 'return':
        await this.recordEvent(instanceId, node.id, 'task.returned', actorId, {
          commentRequired: node.config?.['requireComment'] === true,
        });
        await this.advanceFromNode(instanceId, node.id, graph, variables, actorId);
        break;

      case 'notification': {
        // Record notification intent; actual delivery via a notification service later
        const config = node.config ?? {};
        await this.recordEvent(instanceId, node.id, 'notification.queued', actorId, {
          template: config['template'],
          recipient: config['recipient'],
        });
        await this.advanceFromNode(instanceId, node.id, graph, variables, actorId);
        break;
      }

      case 'automated-task': {
        // Record and auto-advance (real impl would call an integration adapter)
        await this.recordEvent(instanceId, node.id, 'automated-task.executed', actorId);
        await this.advanceFromNode(instanceId, node.id, graph, variables, actorId);
        break;
      }

      default:
        // Unknown node type — record and continue
        await this.recordEvent(instanceId, node.id, `node.unknown.${node.type}`, actorId);
        await this.advanceFromNode(instanceId, node.id, graph, variables, actorId);
    }
  }

  private evaluateCondition(
    condition: GraphEdge['condition'],
    variables: Record<string, unknown>,
  ): boolean {
    if (!condition) return true; // Unconditional edge

    const actual = condition.field.split('.').reduce<unknown>((value, key) => {
      if (!value || typeof value !== 'object') return undefined;
      return (value as Record<string, unknown>)[key];
    }, variables);
    const expected = condition.value;

    switch (condition.operator) {
      case 'equals': return actual === expected;
      case 'not_equals': return actual !== expected;
      case 'gt': return Number(actual) > Number(expected);
      case 'lt': return Number(actual) < Number(expected);
      case 'contains':
        return typeof actual === 'string' && actual.includes(String(expected));
      default: return false;
    }
  }

  private async completeInstance(instanceId: string, actorId: string) {
    await this.prisma.$transaction([
      this.prisma.workflowInstance.update({
        where: { id: instanceId },
        data: { status: 'COMPLETED', finishedAt: new Date() },
      }),
      this.prisma.case.updateMany({
        where: { workflowInstance: { id: instanceId } },
        data: { status: 'CLOSED', closedAt: new Date() },
      }),
    ]);
    await this.recordEvent(instanceId, null, 'instance.completed', actorId);
    await this.audit.record({
      actorId,
      action: 'workflow.instance.completed',
      entityType: 'WorkflowInstance',
      entityId: instanceId,
    });
  }

  private async recordEvent(
    instanceId: string,
    nodeId: string | null,
    eventType: string,
    actorId?: string,
    data?: Record<string, unknown>,
  ) {
    await this.prisma.workflowEvent.create({
      data: {
        instanceId,
        nodeId,
        eventType,
        actorId: actorId ?? null,
        data: (data ?? {}) as object,
      },
    });
  }

  // ── Queries ───────────────────────────────────────────────────────────────

  async getInstance(instanceId: string) {
    const instance = await this.prisma.workflowInstance.findUnique({
      where: { id: instanceId },
      include: {
        events: { orderBy: { occurredAt: 'asc' } },
        tasks: {
          include: {
            assignedTo: { select: { id: true, firstName: true, lastName: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        version: { include: { definition: true } },
      },
    });
    if (!instance) throw new NotFoundException(`Instance ${instanceId} not found`);
    return instance;
  }
}
