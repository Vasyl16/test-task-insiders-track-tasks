import {
  Global,
  INestApplication,
  Module,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { User } from '@prisma/client';
import { RedisService } from '@redis/redis.service';
import { AuthModule } from '../auth.module';
import { AuthRepository } from '../auth.repository';

// AuthService now caches through RedisService — not what this integration
// test is about, so it's stubbed as an always-miss, never-fails cache
// rather than pulling in the real RedisModule/a live Redis connection.
// RedisModule is never imported here (this test only imports AuthModule),
// so plain `.overrideProvider(RedisService)` has nothing to override —
// providing it via a small @Global test module makes it reachable from
// AuthService the same way the real (also @Global) RedisModule would.
// useFactory (not useValue) so the module can be declared once at file
// scope while still returning whatever `redisService` is assigned to by
// the time this factory actually runs (inside beforeAll, before it).
let redisService: jest.Mocked<RedisService>;

@Global()
@Module({
  providers: [{ provide: RedisService, useFactory: () => redisService }],
  exports: [RedisService],
})
class TestRedisModule {}

// Integration layer: real AuthController + real AuthService + real
// JwtModule/JwtStrategy wiring, with only the DB (AuthRepository) mocked —
// per the task's "mock only external dependencies" requirement.
describe('AuthController (integration)', () => {
  let app: INestApplication;
  let authRepository: jest.Mocked<AuthRepository>;
  let jwtService: JwtService;

  const now = new Date('2026-01-01T00:00:00.000Z');
  let user: User;

  beforeAll(async () => {
    user = {
      id: 'user-1',
      email: 'jane@example.com',
      name: 'Jane',
      password: await bcrypt.hash('correct-password', 10),
      createdAt: now,
      updatedAt: now,
    };

    authRepository = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      createUser: jest.fn(),
      createRefreshToken: jest.fn(),
      findRefreshTokenByHash: jest.fn(),
      revokeRefreshToken: jest.fn(),
      rotateRefreshToken: jest.fn(),
    } as unknown as jest.Mocked<AuthRepository>;

    redisService = {
      get: jest.fn().mockResolvedValue(undefined),
      set: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined),
      delByPrefix: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<RedisService>;

    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [
            () => ({
              jwt: {
                accessSecret: 'integration-test-access-secret',
                accessExpiresIn: '15m',
                refreshExpiresIn: '7d',
              },
            }),
          ],
        }),
        TestRedisModule,
        AuthModule,
      ],
    })
      .overrideProvider(AuthRepository)
      .useValue(authRepository)
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

    jwtService = moduleRef.get(JwtService);
  });

  afterEach(() => jest.clearAllMocks());

  afterAll(() => app.close());

  describe('POST /auth/register', () => {
    it('returns 201 with tokens and a safe user payload', async () => {
      authRepository.findByEmail.mockResolvedValue(null);
      authRepository.createUser.mockResolvedValue(user);
      authRepository.createRefreshToken.mockResolvedValue({} as never);

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: user.email, password: 'a-new-password', name: 'Jane' })
        .expect(201);

      expect(response.body.user).toEqual({
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt.toISOString(),
      });
      expect(response.body.user.password).toBeUndefined();
      expect(response.body.accessToken).toEqual(expect.any(String));
      expect(response.body.refreshToken).toEqual(expect.any(String));
    });

    it('returns 409 when the email is already registered', async () => {
      authRepository.findByEmail.mockResolvedValue(user);

      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: user.email, password: 'a-new-password', name: 'Jane' })
        .expect(409);
    });

    it('returns 400 for an invalid email', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'not-an-email',
          password: 'a-new-password',
          name: 'Jane',
        })
        .expect(400);
    });

    it('returns 400 when unknown properties are sent (whitelist)', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'someone@example.com',
          password: 'a-new-password',
          name: 'Jane',
          isAdmin: true,
        })
        .expect(400);
    });
  });

  describe('POST /auth/login', () => {
    it('returns 200 with tokens for valid credentials', async () => {
      authRepository.findByEmail.mockResolvedValue(user);
      authRepository.createRefreshToken.mockResolvedValue({} as never);

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: user.email, password: 'correct-password' })
        .expect(200);

      expect(response.body.accessToken).toEqual(expect.any(String));
      expect(response.body.refreshToken).toEqual(expect.any(String));
    });

    it('returns 401 for a wrong password', async () => {
      authRepository.findByEmail.mockResolvedValue(user);

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: user.email, password: 'wrong-password' })
        .expect(401);
    });

    it('returns 401 when the user does not exist', async () => {
      authRepository.findByEmail.mockResolvedValue(null);

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'nobody@example.com', password: 'correct-password' })
        .expect(401);
    });
  });

  describe('POST /auth/refresh', () => {
    it('returns 200 with rotated tokens for a valid refresh token', async () => {
      authRepository.findRefreshTokenByHash.mockResolvedValue({
        id: 'token-1',
        tokenHash: 'irrelevant',
        userId: user.id,
        expiresAt: new Date(Date.now() + 60_000),
        revokedAt: null,
        createdAt: now,
      });
      authRepository.findById.mockResolvedValue(user);
      authRepository.rotateRefreshToken.mockResolvedValue({} as never);

      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: 'some-raw-refresh-token' })
        .expect(200);

      expect(response.body.accessToken).toEqual(expect.any(String));
      expect(response.body.refreshToken).toEqual(expect.any(String));
    });

    it('returns 401 for an unknown refresh token', async () => {
      authRepository.findRefreshTokenByHash.mockResolvedValue(null);

      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: 'unknown-token' })
        .expect(401);
    });
  });

  describe('POST /auth/logout', () => {
    it('returns 204 for a valid refresh token', async () => {
      authRepository.findRefreshTokenByHash.mockResolvedValue({
        id: 'token-1',
        tokenHash: 'irrelevant',
        userId: user.id,
        expiresAt: new Date(Date.now() + 60_000),
        revokedAt: null,
        createdAt: now,
      });

      await request(app.getHttpServer())
        .post('/auth/logout')
        .send({ refreshToken: 'some-raw-refresh-token' })
        .expect(204);

      expect(authRepository.revokeRefreshToken).toHaveBeenCalledWith('token-1');
    });

    it('returns 401 for an unknown refresh token', async () => {
      authRepository.findRefreshTokenByHash.mockResolvedValue(null);

      await request(app.getHttpServer())
        .post('/auth/logout')
        .send({ refreshToken: 'unknown-token' })
        .expect(401);
    });
  });

  describe('GET /auth/me', () => {
    it('returns 401 without a bearer token (guard)', async () => {
      await request(app.getHttpServer()).get('/auth/me').expect(401);
    });

    it('returns 401 for a malformed bearer token (guard)', async () => {
      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', 'Bearer not-a-real-jwt')
        .expect(401);
    });

    it('returns 200 with the current user for a valid bearer token', async () => {
      authRepository.findById.mockResolvedValue(user);
      const token = await jwtService.signAsync({
        sub: user.id,
        email: user.email,
      });

      const response = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toEqual({
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt.toISOString(),
      });
    });
  });
});
