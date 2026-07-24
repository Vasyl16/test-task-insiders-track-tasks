import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

// Real HTTP endpoints over the actual AppModule wiring (real Postgres via
// DATABASE_URL, real JwtModule, real ValidationPipe/AllExceptionsFilter) —
// per the task's e2e requirement. Uses a uniquely-generated email per run
// and cleans up everything it creates in afterAll, since this hits whatever
// database DATABASE_URL points at (a dedicated test database is strongly
// recommended over pointing this at a shared/dev database).
describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const runId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const email = `e2e-auth-${runId}@example.com`;
  const password = 'correct-password';
  const name = 'E2E Auth User';

  let refreshToken: string;
  let accessToken: string;

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
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email } });
    await app.close();
  });

  it('POST /api/auth/register registers a new user', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email, password, name })
      .expect(201);

    expect(response.body.user).toMatchObject({ email, name });
    expect(response.body.user.password).toBeUndefined();
    expect(response.body.accessToken).toEqual(expect.any(String));
    expect(response.body.refreshToken).toEqual(expect.any(String));

    refreshToken = response.body.refreshToken;
  });

  it('POST /api/auth/register rejects a duplicate email with 409', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email, password, name })
      .expect(409);
  });

  it('POST /api/auth/login rejects wrong credentials with 401', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password: 'wrong-password' })
      .expect(401);
  });

  it('POST /api/auth/login succeeds with correct credentials', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password })
      .expect(200);

    expect(response.body.accessToken).toEqual(expect.any(String));
    expect(response.body.refreshToken).toEqual(expect.any(String));

    accessToken = response.body.accessToken;
  });

  it('GET /api/auth/me rejects a request with no token with 401', async () => {
    await request(app.getHttpServer()).get('/api/auth/me').expect(401);
  });

  it('GET /api/auth/me returns the current user for a valid token', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body).toMatchObject({ email, name });
  });

  it('POST /api/auth/refresh rejects an invalid refresh token with 401', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken: 'not-a-real-refresh-token' })
      .expect(401);
  });

  it('POST /api/auth/refresh rotates a valid refresh token', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken })
      .expect(200);

    expect(response.body.accessToken).toEqual(expect.any(String));
    expect(response.body.refreshToken).toEqual(expect.any(String));
    expect(response.body.refreshToken).not.toBe(refreshToken);

    // The old refresh token is revoked as part of rotation.
    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken })
      .expect(401);

    refreshToken = response.body.refreshToken;
  });

  it('POST /api/auth/logout rejects an invalid refresh token with 401', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/logout')
      .send({ refreshToken: 'not-a-real-refresh-token' })
      .expect(401);
  });

  it('POST /api/auth/logout revokes a valid refresh token', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/logout')
      .send({ refreshToken })
      .expect(204);

    // A revoked refresh token can no longer be used to get new tokens.
    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken })
      .expect(401);
  });
});
