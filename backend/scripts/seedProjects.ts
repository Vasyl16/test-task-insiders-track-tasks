import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const WORKSPACE_ID = 'REPLACE_WITH_WORKSPACE_ID';

const PROJECT_COUNT = 10;

async function main() {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  try {
    const workspace = await prisma.workspace.findUnique({
      where: { id: WORKSPACE_ID },
    });

    if (!workspace) {
      console.error(
        `Workspace "${WORKSPACE_ID}" does not exist. Set WORKSPACE_ID in scripts/seedProjects.ts to a real workspace id.`,
      );
      return;
    }

    const projects = Array.from({ length: PROJECT_COUNT }, (_, index) => ({
      workspaceId: workspace.id,
      name: `Untitled Project ${index + 1}`,
      createdBy: workspace.ownerId,
    }));

    await prisma.project.createMany({ data: projects });

    console.log(
      `Seeded ${projects.length} empty projects into workspace "${workspace.name}" (${workspace.id}).`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
