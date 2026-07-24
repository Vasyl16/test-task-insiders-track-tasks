import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { RefreshToken, User } from '@prisma/client';
import { AppConfig } from '@config/config.types';
import { AuthRepository } from '../auth.repository';
import { AuthService } from '../auth.service';
import { LoginDto } from '../dto/login.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import { RegisterDto } from '../dto/register.dto';

jest.mock('bcrypt');

const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('AuthService', () => {
  let service: AuthService;
  let authRepository: jest.Mocked<AuthRepository>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService<AppConfig, true>>;

  const now = new Date('2026-01-01T00:00:00.000Z');
  const user: User = {
    id: 'user-1',
    email: 'jane@example.com',
    name: 'Jane',
    password: 'hashed-password',
    createdAt: now,
    updatedAt: now,
  };

  const storedRefreshToken: RefreshToken = {
    id: 'token-1',
    tokenHash: 'hashed-token',
    userId: user.id,
    expiresAt: new Date(Date.now() + 60_000),
    revokedAt: null,
    createdAt: now,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    authRepository = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      createUser: jest.fn(),
      createRefreshToken: jest.fn(),
      findRefreshTokenByHash: jest.fn(),
      revokeRefreshToken: jest.fn(),
      rotateRefreshToken: jest.fn(),
    } as unknown as jest.Mocked<AuthRepository>;

    jwtService = {
      signAsync: jest.fn().mockResolvedValue('signed-access-token'),
      verifyAsync: jest.fn(),
    } as unknown as jest.Mocked<JwtService>;

    configService = {
      get: jest.fn().mockReturnValue({
        accessSecret: 'test-access-secret',
        accessExpiresIn: '15m',
        refreshExpiresIn: '7d',
      }),
    } as unknown as jest.Mocked<ConfigService<AppConfig, true>>;

    service = new AuthService(authRepository, jwtService, configService);
  });

  describe('register', () => {
    const dto: RegisterDto = {
      email: user.email,
      password: 'plain-password',
      name: user.name,
    };

    it('creates a user and issues tokens when the email is free', async () => {
      authRepository.findByEmail.mockResolvedValue(null);
      mockedBcrypt.hash.mockResolvedValue('hashed-password' as never);
      authRepository.createUser.mockResolvedValue(user);
      authRepository.createRefreshToken.mockResolvedValue(storedRefreshToken);

      const result = await service.register(dto);

      expect(authRepository.findByEmail).toHaveBeenCalledWith(dto.email);
      expect(mockedBcrypt.hash).toHaveBeenCalledWith(dto.password, 10);
      expect(authRepository.createUser).toHaveBeenCalledWith({
        email: dto.email,
        password: 'hashed-password',
        name: dto.name,
      });
      expect(result.user).toEqual({
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
      });
      expect(result.accessToken).toBe('signed-access-token');
      expect(result.refreshToken).toEqual(expect.any(String));
    });

    it('throws ConflictException when the email is already registered', async () => {
      authRepository.findByEmail.mockResolvedValue(user);

      await expect(service.register(dto)).rejects.toThrow(ConflictException);
      expect(authRepository.createUser).not.toHaveBeenCalled();
      expect(mockedBcrypt.hash).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const dto: LoginDto = { email: user.email, password: 'plain-password' };

    it('returns tokens when credentials are valid', async () => {
      authRepository.findByEmail.mockResolvedValue(user);
      mockedBcrypt.compare.mockResolvedValue(true as never);
      authRepository.createRefreshToken.mockResolvedValue(storedRefreshToken);

      const result = await service.login(dto);

      expect(mockedBcrypt.compare).toHaveBeenCalledWith(
        dto.password,
        user.password,
      );
      expect(result.accessToken).toBe('signed-access-token');
      expect(result.refreshToken).toEqual(expect.any(String));
    });

    it('throws UnauthorizedException when the user does not exist', async () => {
      authRepository.findByEmail.mockResolvedValue(null);

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
      expect(mockedBcrypt.compare).not.toHaveBeenCalled();
    });

    it('throws UnauthorizedException when the password does not match', async () => {
      authRepository.findByEmail.mockResolvedValue(user);
      mockedBcrypt.compare.mockResolvedValue(false as never);

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refresh', () => {
    const dto: RefreshTokenDto = { refreshToken: 'raw-refresh-token' };

    it('rotates the refresh token and returns new tokens', async () => {
      authRepository.findRefreshTokenByHash.mockResolvedValue(
        storedRefreshToken,
      );
      authRepository.findById.mockResolvedValue(user);
      authRepository.rotateRefreshToken.mockResolvedValue({
        ...storedRefreshToken,
        id: 'token-2',
      });

      const result = await service.refresh(dto);

      expect(authRepository.rotateRefreshToken).toHaveBeenCalledWith(
        expect.objectContaining({
          oldTokenId: storedRefreshToken.id,
          userId: user.id,
        }),
      );
      expect(result.accessToken).toBe('signed-access-token');
      expect(result.refreshToken).toEqual(expect.any(String));
    });

    it('throws UnauthorizedException when the token is unknown', async () => {
      authRepository.findRefreshTokenByHash.mockResolvedValue(null);

      await expect(service.refresh(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when the token was revoked', async () => {
      authRepository.findRefreshTokenByHash.mockResolvedValue({
        ...storedRefreshToken,
        revokedAt: now,
      });

      await expect(service.refresh(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when the token has expired', async () => {
      authRepository.findRefreshTokenByHash.mockResolvedValue({
        ...storedRefreshToken,
        expiresAt: new Date(now.getTime() - 1000),
      });

      await expect(service.refresh(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when the owning user no longer exists', async () => {
      authRepository.findRefreshTokenByHash.mockResolvedValue(
        storedRefreshToken,
      );
      authRepository.findById.mockResolvedValue(null);

      await expect(service.refresh(dto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    const dto: RefreshTokenDto = { refreshToken: 'raw-refresh-token' };

    it('revokes the matching refresh token', async () => {
      authRepository.findRefreshTokenByHash.mockResolvedValue(
        storedRefreshToken,
      );

      await service.logout(dto);

      expect(authRepository.revokeRefreshToken).toHaveBeenCalledWith(
        storedRefreshToken.id,
      );
    });

    it('throws UnauthorizedException when the token is unknown', async () => {
      authRepository.findRefreshTokenByHash.mockResolvedValue(null);

      await expect(service.logout(dto)).rejects.toThrow(UnauthorizedException);
      expect(authRepository.revokeRefreshToken).not.toHaveBeenCalled();
    });

    it('throws UnauthorizedException when the token is already revoked', async () => {
      authRepository.findRefreshTokenByHash.mockResolvedValue({
        ...storedRefreshToken,
        revokedAt: now,
      });

      await expect(service.logout(dto)).rejects.toThrow(UnauthorizedException);
      expect(authRepository.revokeRefreshToken).not.toHaveBeenCalled();
    });
  });

  describe('verifyAccessToken', () => {
    it('returns the user for a valid token', async () => {
      jwtService.verifyAsync.mockResolvedValue({
        sub: user.id,
        email: user.email,
      });
      authRepository.findById.mockResolvedValue(user);

      const result = await service.verifyAccessToken('valid-token');

      expect(jwtService.verifyAsync).toHaveBeenCalledWith('valid-token', {
        secret: 'test-access-secret',
      });
      expect(result).toEqual({
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
      });
    });

    it('throws UnauthorizedException when the token fails verification', async () => {
      jwtService.verifyAsync.mockRejectedValue(new Error('bad token'));

      await expect(service.verifyAccessToken('bad-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException when the token user no longer exists', async () => {
      jwtService.verifyAsync.mockResolvedValue({
        sub: user.id,
        email: user.email,
      });
      authRepository.findById.mockResolvedValue(null);

      await expect(service.verifyAccessToken('valid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
