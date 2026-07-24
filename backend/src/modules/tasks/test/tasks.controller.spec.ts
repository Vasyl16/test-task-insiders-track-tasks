import {
  CanActivate,
  ExecutionContext,
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import {
  Project,
  TaskPriority,
  TaskStatus,
  Workspace,
  WorkspaceMember,
  WorkspaceRole,
} from '@prisma/client';
import { JwtAuthGuard } from '@common/guards';
import { RealtimeService } from '@modules/realtime/realtime.service';
import { TasksController } from '../tasks.controller';
import { TasksRepository } from '../tasks.repository';
import { TasksService } from '../tasks.service';

const CURRENT_USER = { id: 'user-1', email: 'jane@example.com' };

// Same rationale as ProjectsController's test: a fake guard stands in for
// JwtAuthGuard (already covered by the Auth module's tests), keeping this
// focused on TasksController + TasksService wiring.
class FakeJwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    if (!req.headers['x-test-auth']) {
      throw new UnauthorizedException();
    }
    req.user = CURRENT_USER;
    return true;
  }
}

describe('TasksController (integration)', () => {
  let app: INestApplication;
  let repo: jest.Mocked<TasksRepository>;
  let realtime: jest.Mocked<RealtimeService>;

  const now = new Date('2026-01-01T00:00:00.000Z');
  const workspaceId = 'workspace-1';
  const projectId = 'project-1';
  const workspace = { id: workspaceId } as Workspace;
  const project = { id: projectId, workspaceId } as Project;
  const membership = {
    workspaceId,
    userId: CURRENT_USER.id,
    role: WorkspaceRole.MEMBER,
  } as WorkspaceMember;
  const task = {
    id: 'task-1',
    projectId,
    title: 'Task 1',
    description: null,
    status: TaskStatus.TODO,
    priority: TaskPriority.MEDIUM,
    assigneeId: null,
    dueDate: null,
    createdBy: CURRENT_USER.id,
    createdAt: now,
    updatedAt: now,
  };

  beforeAll(async () => {
    repo = {
      findWorkspaceById: jest.fn(),
      findProjectById: jest.fn(),
      findWorkspaceMembership: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
      findManyForProject: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<TasksRepository>;

    realtime = {
      emitTaskCreated: jest.fn(),
      emitTaskUpdated: jest.fn(),
      emitTaskDeleted: jest.fn(),
    } as unknown as jest.Mocked<RealtimeService>;

    const moduleRef = await Test.createTestingModule({
      controllers: [TasksController],
      providers: [
        TasksService,
        { provide: TasksRepository, useValue: repo },
        { provide: RealtimeService, useValue: realtime },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(new FakeJwtAuthGuard())
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    repo.findWorkspaceById.mockResolvedValue(workspace);
    repo.findProjectById.mockResolvedValue(project);
    repo.findWorkspaceMembership.mockResolvedValue(membership);
  });

  afterAll(() => app.close());

  const base = `/workspaces/${workspaceId}/projects/${projectId}/tasks`;

  it('rejects unauthenticated requests with 401', async () => {
    await request(app.getHttpServer()).get(base).expect(401);
  });

  it('POST creates a task and returns 201', async () => {
    repo.create.mockResolvedValue(task);

    const response = await request(app.getHttpServer())
      .post(base)
      .set('x-test-auth', '1')
      .send({ title: 'Task 1' })
      .expect(201);

    expect(response.body).toMatchObject({ id: task.id, title: task.title });
    expect(realtime.emitTaskCreated).toHaveBeenCalled();
  });

  it('POST returns 400 for an invalid body', async () => {
    await request(app.getHttpServer())
      .post(base)
      .set('x-test-auth', '1')
      .send({ title: '' })
      .expect(400);
  });

  it('POST returns 400 when the assignee is not a workspace member', async () => {
    repo.findWorkspaceMembership
      .mockResolvedValueOnce(membership)
      .mockResolvedValueOnce(null);

    await request(app.getHttpServer())
      .post(base)
      .set('x-test-auth', '1')
      .send({
        title: 'Task 1',
        assigneeId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      })
      .expect(400);
  });

  it('GET list returns { items, nextCursor }', async () => {
    repo.findManyForProject.mockResolvedValue([task]);

    const response = await request(app.getHttpServer())
      .get(base)
      .set('x-test-auth', '1')
      .expect(200);

    expect(response.body.nextCursor).toBeNull();
    expect(response.body.items).toHaveLength(1);
  });

  it('GET :id returns 404 when the task is not found', async () => {
    repo.findById.mockResolvedValue(null);

    await request(app.getHttpServer())
      .get(`${base}/missing`)
      .set('x-test-auth', '1')
      .expect(404);
  });

  it('PATCH :id updates the task and returns 200', async () => {
    repo.findById.mockResolvedValue(task);
    repo.update.mockResolvedValue({ ...task, status: TaskStatus.DONE });

    const response = await request(app.getHttpServer())
      .patch(`${base}/${task.id}`)
      .set('x-test-auth', '1')
      .send({ status: TaskStatus.DONE })
      .expect(200);

    expect(response.body.status).toBe(TaskStatus.DONE);
    expect(realtime.emitTaskUpdated).toHaveBeenCalled();
  });

  it('DELETE :id returns 403 when the caller may not delete it', async () => {
    repo.findById.mockResolvedValue({ ...task, createdBy: 'someone-else' });

    await request(app.getHttpServer())
      .delete(`${base}/${task.id}`)
      .set('x-test-auth', '1')
      .expect(403);
  });

  it('DELETE :id returns 204 on success', async () => {
    repo.findById.mockResolvedValue(task);
    repo.delete.mockResolvedValue(task);

    await request(app.getHttpServer())
      .delete(`${base}/${task.id}`)
      .set('x-test-auth', '1')
      .expect(204);

    expect(realtime.emitTaskDeleted).toHaveBeenCalled();
  });
});
