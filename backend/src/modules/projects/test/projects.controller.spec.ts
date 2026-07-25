import {
  CanActivate,
  ExecutionContext,
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { Workspace, WorkspaceMember, WorkspaceRole } from '@prisma/client';
import { JwtAuthGuard } from '@common/guards';
import { RedisService } from '@redis/redis.service';
import { ProjectsController } from '../projects.controller';
import { ProjectsRepository } from '../projects.repository';
import { ProjectsService } from '../projects.service';

const CURRENT_USER = { id: 'user-1', email: 'jane@example.com' };

// Stands in for the real JwtAuthGuard: authenticates whenever an
// `x-test-auth` header is present (attaching CURRENT_USER, same as
// JwtStrategy.validate would), and otherwise throws the same
// UnauthorizedException the real guard throws for a missing/invalid token.
// This keeps the test focused on ProjectsController + ProjectsService wiring
// without pulling in the full AuthModule/JwtStrategy/Prisma stack, which is
// already covered by the Auth module's own tests.
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

describe('ProjectsController (integration)', () => {
  let app: INestApplication;
  let repo: jest.Mocked<ProjectsRepository>;

  const now = new Date('2026-01-01T00:00:00.000Z');
  const workspaceId = 'workspace-1';
  const workspace = { id: workspaceId } as Workspace;
  const membership = {
    workspaceId,
    userId: CURRENT_USER.id,
    role: WorkspaceRole.MEMBER,
  } as WorkspaceMember;
  const project = {
    id: 'project-1',
    workspaceId,
    name: 'Project 1',
    description: null,
    createdBy: CURRENT_USER.id,
    createdAt: now,
    updatedAt: now,
  };

  beforeAll(async () => {
    repo = {
      findWorkspaceById: jest.fn(),
      findWorkspaceMembership: jest.fn(),
      findWorkspaceMemberUserIds: jest.fn().mockResolvedValue([]),
      create: jest.fn(),
      findById: jest.fn(),
      findManyForWorkspace: jest.fn(),
      countForWorkspace: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<ProjectsRepository>;

    const redisService: jest.Mocked<RedisService> = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      delByPrefix: jest.fn(),
    } as unknown as jest.Mocked<RedisService>;

    const moduleRef = await Test.createTestingModule({
      controllers: [ProjectsController],
      providers: [
        ProjectsService,
        { provide: ProjectsRepository, useValue: repo },
        { provide: RedisService, useValue: redisService },
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
    repo.findWorkspaceMembership.mockResolvedValue(membership);
  });

  afterAll(() => app.close());

  it('rejects unauthenticated requests with 401', async () => {
    await request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/projects`)
      .expect(401);
  });

  it('POST creates a project and returns 201', async () => {
    repo.create.mockResolvedValue(project);

    const response = await request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/projects`)
      .set('x-test-auth', '1')
      .send({ name: 'Project 1' })
      .expect(201);

    expect(response.body).toMatchObject({ id: project.id, name: project.name });
  });

  it('POST returns 400 for an invalid body', async () => {
    await request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/projects`)
      .set('x-test-auth', '1')
      .send({ name: '' })
      .expect(400);
  });

  it('GET list returns a paginated shape', async () => {
    repo.findManyForWorkspace.mockResolvedValue([project]);
    repo.countForWorkspace.mockResolvedValue(1);

    const response = await request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/projects`)
      .set('x-test-auth', '1')
      .expect(200);

    expect(response.body).toMatchObject({ total: 1, page: 1, limit: 20 });
    expect(response.body.items).toHaveLength(1);
  });

  it('GET list returns 400 for an out-of-range limit', async () => {
    await request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/projects?limit=1000`)
      .set('x-test-auth', '1')
      .expect(400);
  });

  it('GET :id returns 404 when the project is not found', async () => {
    repo.findById.mockResolvedValue(null);

    await request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/projects/missing`)
      .set('x-test-auth', '1')
      .expect(404);
  });

  it('PATCH :id returns 403 when the caller may not edit it', async () => {
    repo.findById.mockResolvedValue({ ...project, createdBy: 'someone-else' });

    await request(app.getHttpServer())
      .patch(`/workspaces/${workspaceId}/projects/${project.id}`)
      .set('x-test-auth', '1')
      .send({ name: 'New name' })
      .expect(403);
  });

  it('DELETE :id returns 204 on success', async () => {
    repo.findById.mockResolvedValue(project);
    repo.delete.mockResolvedValue(project);

    await request(app.getHttpServer())
      .delete(`/workspaces/${workspaceId}/projects/${project.id}`)
      .set('x-test-auth', '1')
      .expect(204);
  });
});
