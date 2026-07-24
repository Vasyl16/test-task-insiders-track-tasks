import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

// Real HTTP endpoints over the actual AppModule (real Postgres, real
// ValidationPipe/guards/filters). Registers its own user + workspace via the
// API, then exercises Project CRUD nested under it. Cleans up the workspace
// (cascades to its projects) and both users it creates in afterAll.
describe('Projects (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const runId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const ownerEmail = `e2e-projects-owner-${runId}@example.com`;
  const outsiderEmail = `e2e-projects-outsider-${runId}@example.com`;
  const password = 'correct-password';

  let ownerToken: string;
  let outsiderToken: string;
  let workspaceId: string;
  let projectId: string;

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
  });

  afterAll(async () => {
    await prisma.workspace.deleteMany({ where: { id: workspaceId } });
    await prisma.user.deleteMany({
      where: { email: { in: [ownerEmail, outsiderEmail] } },
    });
    await app.close();
  });

  const base = () => `/api/workspaces/${workspaceId}/projects`;

  it('rejects unauthenticated requests with 401', async () => {
    await request(app.getHttpServer()).get(base()).expect(401);
  });

  it('rejects a non-member with 403', async () => {
    await request(app.getHttpServer())
      .post(base())
      .set('Authorization', `Bearer ${outsiderToken}`)
      .send({ name: 'Intruder project' })
      .expect(403);
  });

  it('rejects an invalid body with 400', async () => {
    await request(app.getHttpServer())
      .post(base())
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: '' })
      .expect(400);
  });

  it('creates a project as the workspace owner', async () => {
    const response = await request(app.getHttpServer())
      .post(base())
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'E2E Project' })
      .expect(201);

    expect(response.body).toMatchObject({ name: 'E2E Project', workspaceId });
    projectId = response.body.id;
  });

  it('lists projects with a paginated shape', async () => {
    const response = await request(app.getHttpServer())
      .get(base())
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    expect(response.body).toMatchObject({ total: 1, page: 1, limit: 20 });
    expect(response.body.items).toHaveLength(1);
  });

  it('returns 404 for an unknown project id', async () => {
    await request(app.getHttpServer())
      .get(`${base()}/00000000-0000-4000-8000-000000000000`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(404);
  });

  it('updates the project', async () => {
    const response = await request(app.getHttpServer())
      .patch(`${base()}/${projectId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Renamed Project' })
      .expect(200);

    expect(response.body.name).toBe('Renamed Project');
  });

  it('deletes the project', async () => {
    await request(app.getHttpServer())
      .delete(`${base()}/${projectId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(204);

    await request(app.getHttpServer())
      .get(`${base()}/${projectId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(404);
  });
});
