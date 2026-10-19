import {
  Controller, Get, Post, Put, Param, Body,
  UseGuards, BadRequestException, Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../common/guards/permissions.guard.js';
import { RequirePermissions } from '../common/decorators/permissions.decorator.js';
import { WorkflowDefinitionsService } from './workflow-definitions.service.js';

@Controller('workflow-definitions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class WorkflowDefinitionsController {
  constructor(private readonly svc: WorkflowDefinitionsService) {}

  @Get()
  list() { return this.svc.listDefinitions(); }

  @Get(':id')
  get(@Param('id') id: string) { return this.svc.getDefinition(id); }

  @Post()
  @RequirePermissions('workflow.create')
  create(@Body() body: unknown, @Request() req: { user: { id: string } }) {
    const b = body as Record<string, unknown>;
    if (!b['name']) throw new BadRequestException('name required');
    return this.svc.createDefinition({
      name: String(b['name']),
      description: b['description'] ? String(b['description']) : undefined,
      createdById: req.user.id,
    });
  }

  @Put(':id')
  @RequirePermissions('workflow.edit')
  update(@Param('id') id: string, @Body() body: unknown) {
    const b = body as Record<string, unknown>;
    return this.svc.updateDefinition(id, {
      name: b['name'] ? String(b['name']) : undefined,
      description: b['description'] ? String(b['description']) : undefined,
    });
  }

  /** PUT /workflow-definitions/versions/:versionId/graph — save canvas */
  @Put('versions/:versionId/graph')
  @RequirePermissions('workflow.edit')
  saveGraph(
    @Param('versionId') versionId: string,
    @Body() body: unknown,
    @Request() req: { user: { id: string } },
  ) {
    const b = body as Record<string, unknown>;
    if (!b['nodes'] || !b['edges']) throw new BadRequestException('nodes and edges required');
    return this.svc.saveGraph(
      versionId,
      {
        nodes: b['nodes'] as unknown[],
        edges: b['edges'] as unknown[],
      },
      req.user.id,
    );
  }

  /** POST /workflow-definitions/versions/:versionId/validate */
  @Post('versions/:versionId/validate')
  @RequirePermissions('workflow.edit')
  async validate(
    @Param('versionId') versionId: string,
    @Body() body: unknown,
    @Request() _req: { user: { id: string } },
  ) {
    const version = await this.svc.getVersion(versionId);
    const submitted = body as { nodes?: unknown[]; edges?: unknown[] };
    const graph = submitted.nodes && submitted.edges
      ? { nodes: submitted.nodes, edges: submitted.edges }
      : version.graph as { nodes: unknown[]; edges: unknown[] };
    const errors = this.svc.validateGraph(graph);
    return { valid: errors.length === 0, errors };
  }

  /** POST /workflow-definitions/versions/:versionId/publish */
  @Post('versions/:versionId/publish')
  @RequirePermissions('workflow.publish')
  publish(
    @Param('versionId') versionId: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.svc.publishVersion(versionId, req.user.id);
  }

  /** POST /workflow-definitions/:id/versions — create next draft version */
  @Post(':id/versions')
  @RequirePermissions('workflow.edit')
  newVersion(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.svc.createNewVersion(id, req.user.id);
  }
}
