import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

// Real HTTP endpoints over the actual AppModule. Registers its own user,
// workspace, and project via the API, then exercises Task CRUD nested under
// them. Cleans up the workspace (cascades to its project and tasks) and both
// users it creates in afterAll.
describe('Tasks (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const runId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const ownerEmail = `e2e-tasks-owner-${runId}@example.com`;
  const outsiderEmail = `e2e-tasks-outsider-${runId}@example.com`;
  const password = 'correct-password';

  let ownerToken: string;
  let outsiderToken: string;
  let workspaceId: string;
  let projectId: string;
  let taskId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    prisma = app.get(PrismaService);

    const owner = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: ownerEmail, password, name: 'Owner' });
    ownerToken = owner.body.accessToken;

    const outsider = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: outsiderEmail, password, name: 'Outsider' });
    outsiderToken = outsider.body.accessToken;

    const workspace = await request(app.getHttpServer())
      .post('/api/workspaces')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'E2E Workspace' });
    workspaceId = workspace.body.id;

    const project = await request(app.getHttpServer())
      .post(`/api/workspaces/${workspaceId}/projects`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'E2E Project' });
    projectId = project.body.id;
  });

  afterAll(async () => {
    await prisma.workspace.deleteMany({ where: { id: workspaceId } });
    await prisma.user.deleteMany({
      where: { email: { in: [ownerEmail, outsiderEmail] } },
    });
    await app.close();
  });

  const base = () =>
    `/api/workspaces/${workspaceId}/projects/${projectId}/tasks`;

  it('rejects unauthenticated requests with 401', async () => {
    await request(app.getHttpServer()).get(base()).expect(401);
  });

  it('rejects a non-member with 403', async () => {
    await request(app.getHttpServer())
      .post(base())
      .set('Authorization', `Bearer ${outsiderToken}`)
      .send({ title: 'Intruder task' })
      .expect(403);
  });

  it('rejects an invalid body with 400', async () => {
    await request(app.getHttpServer())
      .post(base())
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ title: '' })
      .expect(400);
  });

  it('creates a task as a workspace member', async () => {
    const response = await request(app.getHttpServer())
      .post(base())
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ title: 'E2E Task' })
      .expect(201);

    expect(response.body).toMatchObject({
      title: 'E2E Task',
      projectId,
      status: 'TODO',
    });
    taskId = response.body.id;
  });

  it('lists tasks with a cursor-paginated shape', async () => {
    const response = await request(app.getHttpServer())
      .get(base())
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    expect(response.body.nextCursor).toBeNull();
    expect(response.body.items).toHaveLength(1);
  });

  it('returns 404 for an unknown task id', async () => {
    await request(app.getHttpServer())
      .get(`${base()}/00000000-0000-4000-8000-000000000000`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(404);
  });

  it('rejects an assignee who is not a workspace member with 400', async () => {
    await request(app.getHttpServer())
      .patch(`${base()}/${taskId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ assigneeId: '00000000-0000-4000-8000-000000000000' })
      .expect(400);
  });

  it('updates the task status', async () => {
    const response = await request(app.getHttpServer())
      .patch(`${base()}/${taskId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ status: 'IN_PROGRESS' })
      .expect(200);

    expect(response.body.status).toBe('IN_PROGRESS');
  });

  it('recorded the status change in the task history', async () => {
    const response = await request(app.getHttpServer())
      .get(`${base()}/${taskId}/history`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    expect(response.body.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          oldStatus: 'TODO',
          newStatus: 'IN_PROGRESS',
        }),
      ]),
    );
  });

  it('deletes the task', async () => {
    await request(app.getHttpServer())
      .delete(`${base()}/${taskId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(204);

    await request(app.getHttpServer())
      .get(`${base()}/${taskId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(404);
  });
});
