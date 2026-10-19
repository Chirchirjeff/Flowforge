/** Create the IG SACCO loan workflow as version 1 draft. */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  IG_SACCO_LOAN_DESCRIPTION,
  IG_SACCO_LOAN_GRAPH,
} from './templates/ig-sacco-loan-processing.js';

const adapter = new PrismaPg(process.env['DATABASE_URL']!);
const prisma = new PrismaClient({ adapter } as never);
const workflowName = 'IG SACCO Loan Processing';

async function main() {
  const existing = await prisma.workflowDefinition.findFirst({ where: { name: workflowName } });
  if (existing) {
    throw new Error(`“${workflowName}” already exists (${existing.id}); no changes were made.`);
  }

  const creator = await prisma.user.findFirst({
    where: { isActive: true },
    orderBy: [{ email: 'asc' }],
    select: { id: true },
  });
  if (!creator) throw new Error('Create an active Flowforge user before seeding the workflow.');

  const definition = await prisma.workflowDefinition.create({
    data: {
      name: workflowName,
      description: IG_SACCO_LOAN_DESCRIPTION,
      createdById: creator.id,
      versions: {
        create: {
          version: 1,
          status: 'DRAFT',
          graph: IG_SACCO_LOAN_GRAPH as object,
        },
      },
    },
    include: { versions: true },
  });

  console.log(`Created ${workflowName} as draft v1 (${definition.id}).`);
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'Could not create workflow.');
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
