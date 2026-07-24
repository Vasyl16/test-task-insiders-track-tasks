import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import { User } from '@prisma/client';
import { AuthRepository } from '@modules/auth/auth.repository';
import { JwtStrategy } from '@modules/auth/strategies/jwt.strategy';
import { JwtAuthGuard } from '../jwt-auth.guard';

const SECRET = 'guard-test-secret';

function contextFor(authorizationHeader?: string): ExecutionContext {
  const request = {
    headers: authorizationHeader ? { authorization: authorizationHeader } : {},
  };
  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => ({}),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

// Exercises the real JwtAuthGuard + JwtStrategy pair (only the DB lookup is
// mocked) rather than the trivial "is a class" check, since the guard's
// entire behavior comes from that delegation.
describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let jwtService: JwtService;
  let authRepository: jest.Mocked<AuthRepository>;

  const user: User = {
    id: 'user-1',
    email: 'jane@example.com',
    name: 'Jane',
    password: 'hashed',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  beforeAll(async () => {
    authRepository = {
      findById: jest.fn(),
    } as unknown as jest.Mocked<AuthRepository>;

    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => ({ jwt: { accessSecret: SECRET } })],
        }),
        PassportModule,
        JwtModule.register({ secret: SECRET }),
      ],
      providers: [
        JwtStrategy,
        JwtAuthGuard,
        { provide: AuthRepository, useValue: authRepository },
      ],
    }).compile();

    guard = moduleRef.get(JwtAuthGuard);
    jwtService = moduleRef.get(JwtService);
  });

  beforeEach(() => jest.clearAllMocks());

  it('throws UnauthorizedException when there is no bearer token', async () => {
    await expect(guard.canActivate(contextFor())).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('throws UnauthorizedException for a malformed token', async () => {
    await expect(
      guard.canActivate(contextFor('Bearer not-a-real-jwt')),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('activates and attaches the user for a valid token', async () => {
    authRepository.findById.mockResolvedValue(user);
    const token = await jwtService.signAsync({
      sub: user.id,
      email: user.email,
    });
    const context = contextFor(`Bearer ${token}`);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(context.switchToHttp().getRequest().user).toMatchObject({
      id: user.id,
      email: user.email,
    });
  });

  it('throws UnauthorizedException when the token’s user no longer exists', async () => {
    authRepository.findById.mockResolvedValue(null);
    const token = await jwtService.signAsync({
      sub: user.id,
      email: user.email,
    });

    await expect(
      guard.canActivate(contextFor(`Bearer ${token}`)),
    ).rejects.toThrow(UnauthorizedException);
  });
});
