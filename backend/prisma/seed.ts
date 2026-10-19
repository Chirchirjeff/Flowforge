/**
 * Seed script — creates the first Platform Administrator account.
 *
 * Run:  npx tsx prisma/seed.ts
 *
 * Change the email/password before running in production.
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcrypt';

const connectionString = process.env['DATABASE_URL']!;
const adapter = new PrismaPg(connectionString);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  const email = 'admin@flowforge.local';
  const plainPassword = 'Admin1234!';

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`User ${email} already exists — skipping.`);
    return;
  }

  const passwordHash = await bcrypt.hash(plainPassword, 12);
  const user = await prisma.user.create({
    data: { email, passwordHash, firstName: 'Platform', lastName: 'Admin' },
  });

  // Assign the Platform Administrator role
  const adminRole = await prisma.role.findFirst({
    where: { name: 'Platform Administrator' },
  });

  if (adminRole) {
    await prisma.userRole.create({
      data: { userId: user.id, roleId: adminRole.id },
    });
    console.log(`✓ Created ${email} with role "Platform Administrator"`);
  } else {
    console.log(`✓ Created ${email} (no roles seeded yet — start the server first to seed roles)`);
  }

  console.log(`\nLogin credentials:\n  Email:    ${email}\n  Password: ${plainPassword}\n`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
