import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, TaskPriority, TaskStatus } from '@prisma/client';

const PROJECT_ID = 'REPLACE_WITH_PROJECT_ID';

const MIN_TASKS = 30;
const MAX_TASKS = 40;

const TASK_TITLES = [
  'Fix login redirect bug',
  'Set up CI pipeline',
  'Write unit tests for auth module',
  'Design database schema',
  'Implement password reset flow',
  'Add pagination to task list',
  'Refactor task repository',
  'Improve error messages',
  'Set up logging',
  'Add rate limiting',
  'Write API documentation',
  'Fix flaky e2e test',
  'Optimize database queries',
  'Add dark mode support',
  'Update dependencies',
  'Investigate memory leak',
  'Add drag-and-drop reordering',
  'Set up staging environment',
  'Improve accessibility',
  'Add search functionality',
];

const TASK_STATUSES = Object.values(TaskStatus);
const TASK_PRIORITIES = Object.values(TaskPriority);

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function randomTaskCount(): number {
  return MIN_TASKS + Math.floor(Math.random() * (MAX_TASKS - MIN_TASKS + 1));
}

async function main() {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  try {
    const project = await prisma.project.findUnique({
      where: { id: PROJECT_ID },
    });

    if (!project) {
      console.error(
        `Project "${PROJECT_ID}" does not exist. Set PROJECT_ID in scripts/seedTasks.ts to a real project id.`,
      );
      return;
    }

    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId: project.workspaceId },
      select: { userId: true },
    });
    const memberIds = members.map((member) => member.userId);

    const taskCount = randomTaskCount();

    const tasks = Array.from({ length: taskCount }, (_, index) => ({
      projectId: project.id,
      title: `${pickRandom(TASK_TITLES)} #${index + 1}`,
      status: pickRandom(TASK_STATUSES),
      priority: pickRandom(TASK_PRIORITIES),
      assigneeId: memberIds.length > 0 ? pickRandom(memberIds) : undefined,
      createdBy: project.createdBy,
    }));

    await prisma.task.createMany({ data: tasks });

    console.log(
      `Seeded ${tasks.length} tasks into project "${project.name}" (${project.id}).`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
