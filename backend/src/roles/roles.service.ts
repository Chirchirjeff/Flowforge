import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

// Seed permissions defined in the spec
export const SEED_PERMISSIONS = [
  'workflow.create', 'workflow.edit', 'workflow.publish', 'workflow.delete',
  'case.create', 'case.read', 'case.assign', 'case.cancel',
  'task.complete', 'task.reassign', 'task.claim',
  'document.upload', 'document.download',
  'audit.read',
  'user.manage',
  'role.manage',
  'report.view',
];

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async seedPermissions() {
    for (const key of SEED_PERMISSIONS) {
      await this.prisma.permission.upsert({
        where: { key },
        create: { key },
        update: {},
      });
    }
  }

  async listRoles() {
    return this.prisma.role.findMany({
      include: { permissions: { include: { permission: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async listPermissions() {
    return this.prisma.permission.findMany({ orderBy: { key: 'asc' } });
  }

  async createRole(name: string, description?: string, permissionKeys: string[] = []) {
    const permissions = await this.prisma.permission.findMany({
      where: { key: { in: permissionKeys } },
    });
    return this.prisma.role.create({
      data: {
        name,
        description,
        permissions: {
          create: permissions.map((p: { id: string }) => ({ permissionId: p.id })),
        },
      },
      include: { permissions: { include: { permission: true } } },
    });
  }

  async updateRole(id: string, dto: { name?: string; description?: string; permissionKeys?: string[] }) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) throw new NotFoundException(`Role ${id} not found`);

    if (dto.permissionKeys !== undefined) {
      // Replace permission set
      await this.prisma.rolePermission.deleteMany({ where: { roleId: id } });
      const permissions = await this.prisma.permission.findMany({
        where: { key: { in: dto.permissionKeys } },
      });
      await this.prisma.rolePermission.createMany({
        data: permissions.map((p: { id: string }) => ({ roleId: id, permissionId: p.id })),
        skipDuplicates: true,
      });
    }

    return this.prisma.role.update({
      where: { id },
      data: { name: dto.name, description: dto.description },
      include: { permissions: { include: { permission: true } } },
    });
  }

  async seedDefaultRoles() {
    await this.seedPermissions();

    const defaults: Record<string, string[]> = {
      'Platform Administrator': SEED_PERMISSIONS,
      'Workflow Designer': ['workflow.create', 'workflow.edit', 'workflow.publish'],
      'Workflow Officer': ['case.create', 'case.read', 'task.complete', 'task.claim', 'document.upload'],
      'Department Manager': ['case.read', 'case.assign', 'task.reassign', 'report.view'],
      'Auditor': ['audit.read', 'case.read', 'report.view'],
    };

    for (const [name, keys] of Object.entries(defaults)) {
      const existing = await this.prisma.role.findUnique({ where: { name } });
      if (!existing) await this.createRole(name, undefined, keys);
    }
  }
}
