import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuthService } from '../auth/auth.service.js';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
  ) {}

  private safeUser(user: { passwordHash?: string; [k: string]: unknown }) {
    const { passwordHash: _, ...safe } = user;
    return safe;
  }

  async list() {
    const users = await this.prisma.user.findMany({
      include: { userRoles: { include: { role: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return users.map(this.safeUser);
  }

  async get(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        userRoles: {
          include: { role: { include: { permissions: { include: { permission: true } } } } },
        },
      },
    });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return this.safeUser(user);
  }

  async create(dto: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Email already in use');

    const passwordHash = await this.auth.hashPassword(dto.password);
    const user = await this.prisma.user.create({
      data: { email: dto.email, passwordHash, firstName: dto.firstName, lastName: dto.lastName },
    });
    return this.safeUser(user);
  }

  async update(id: string, dto: { firstName?: string; lastName?: string; isActive?: boolean }) {
    await this.get(id);
    const user = await this.prisma.user.update({ where: { id }, data: dto });
    return this.safeUser(user);
  }

  async assignRole(userId: string, roleId: string) {
    await this.get(userId);
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) throw new NotFoundException(`Role ${roleId} not found`);

    await this.prisma.userRole.upsert({
      where: { userId_roleId: { userId, roleId } },
      create: { userId, roleId },
      update: {},
    });
    return this.get(userId);
  }

  async removeRole(userId: string, roleId: string) {
    await this.prisma.userRole.deleteMany({ where: { userId, roleId } });
    return this.get(userId);
  }
}
