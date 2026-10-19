import { Controller, Get, Post, Put, Param, Body, UseGuards, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../common/guards/permissions.guard.js';
import { RequirePermissions } from '../common/decorators/permissions.decorator.js';
import { RolesService } from './roles.service.js';

@Controller('roles')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RolesController {
  constructor(private readonly roles: RolesService) {}

  @Get()
  @RequirePermissions('role.manage')
  listRoles() { return this.roles.listRoles(); }

  @Get('permissions')
  @RequirePermissions('role.manage')
  listPermissions() { return this.roles.listPermissions(); }

  @Post()
  @RequirePermissions('role.manage')
  create(@Body() body: unknown) {
    const b = body as Record<string, unknown>;
    if (!b['name']) throw new BadRequestException('name required');
    return this.roles.createRole(
      String(b['name']),
      b['description'] ? String(b['description']) : undefined,
      Array.isArray(b['permissionKeys']) ? (b['permissionKeys'] as string[]) : [],
    );
  }

  @Put(':id')
  @RequirePermissions('role.manage')
  update(@Param('id') id: string, @Body() body: unknown) {
    const b = body as Record<string, unknown>;
    return this.roles.updateRole(id, {
      name: b['name'] ? String(b['name']) : undefined,
      description: b['description'] ? String(b['description']) : undefined,
      permissionKeys: Array.isArray(b['permissionKeys']) ? (b['permissionKeys'] as string[]) : undefined,
    });
  }
}
