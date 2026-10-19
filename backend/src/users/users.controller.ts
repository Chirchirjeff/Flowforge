import {
  Controller, Get, Post, Put, Param, Body,
  UseGuards, BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../common/guards/permissions.guard.js';
import { RequirePermissions } from '../common/decorators/permissions.decorator.js';
import { UsersService } from './users.service.js';

@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @RequirePermissions('user.manage')
  list() { return this.users.list(); }

  @Get(':id')
  @RequirePermissions('user.manage')
  get(@Param('id') id: string) { return this.users.get(id); }

  @Post()
  @RequirePermissions('user.manage')
  create(@Body() body: unknown) {
    const b = body as Record<string, unknown>;
    if (!b['email'] || !b['password'] || !b['firstName'] || !b['lastName']) {
      throw new BadRequestException('email, password, firstName, lastName required');
    }
    return this.users.create({
      email: String(b['email']),
      password: String(b['password']),
      firstName: String(b['firstName']),
      lastName: String(b['lastName']),
    });
  }

  @Put(':id')
  @RequirePermissions('user.manage')
  update(@Param('id') id: string, @Body() body: unknown) {
    const b = body as Record<string, unknown>;
    return this.users.update(id, {
      firstName: b['firstName'] ? String(b['firstName']) : undefined,
      lastName: b['lastName'] ? String(b['lastName']) : undefined,
      isActive: b['isActive'] !== undefined ? Boolean(b['isActive']) : undefined,
    });
  }

  @Post(':id/roles/:roleId')
  @RequirePermissions('user.manage')
  assignRole(@Param('id') id: string, @Param('roleId') roleId: string) {
    return this.users.assignRole(id, roleId);
  }
}
