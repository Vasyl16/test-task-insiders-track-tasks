import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import ms from 'ms';
import { User } from '@prisma/client';
import { AppConfig } from '@config/config.types';
import { cacheKeys } from '@redis/cache-keys';
import { RedisService } from '@redis/redis.service';
import { AuthRepository } from './auth.repository';
import { AuthTokensDto } from './dto/auth-tokens.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { RegisterResponseDto } from './dto/register-response.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';

const SALT_ROUNDS = 10;
const INVALID_CREDENTIALS_MESSAGE = 'Invalid credentials';
const INVALID_REFRESH_TOKEN_MESSAGE = 'Invalid refresh token';

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<AppConfig, true>,
    private readonly redisService: RedisService,
  ) {}

  async register(dto: RegisterDto): Promise<RegisterResponseDto> {
    const existingUser = await this.authRepository.findByEmail(dto.email);
    if (existingUser) {
      throw new ConflictException('Email is already registered');
    }

    const hashedPassword = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const user = await this.authRepository.createUser({
      email: dto.email,
      password: hashedPassword,
      name: dto.name,
    });

    const tokens = await this.issueTokens(user);

    return new RegisterResponseDto({
      user: new UserResponseDto(user),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  }

  async login(dto: LoginDto): Promise<AuthTokensDto> {
    const user = await this.authRepository.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatches) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    return this.issueTokens(user);
  }

  async refresh(dto: RefreshTokenDto): Promise<AuthTokensDto> {
    const tokenHash = this.hashToken(dto.refreshToken);
    const storedToken =
      await this.authRepository.findRefreshTokenByHash(tokenHash);

    if (
      !storedToken ||
      storedToken.revokedAt ||
      storedToken.expiresAt < new Date()
    ) {
      throw new UnauthorizedException(INVALID_REFRESH_TOKEN_MESSAGE);
    }

    const user = await this.authRepository.findById(storedToken.userId);
    if (!user) {
      throw new UnauthorizedException(INVALID_REFRESH_TOKEN_MESSAGE);
    }

    const accessToken = await this.signAccessToken(user);
    const refreshMaterial = this.createRefreshTokenMaterial();

    await this.authRepository.rotateRefreshToken({
      oldTokenId: storedToken.id,
      userId: user.id,
      newTokenHash: refreshMaterial.tokenHash,
      newExpiresAt: refreshMaterial.expiresAt,
    });

    return new AuthTokensDto({
      accessToken,
      refreshToken: refreshMaterial.token,
    });
  }

  // No access token/userId is checked here on purpose — see AuthController.
  // The refresh token's own hash match is the whole authorization: whoever
  // holds it can already mint new access tokens with it (see refresh()
  // above, also unauthenticated), so revoking it needs no extra proof.
  async logout(dto: RefreshTokenDto): Promise<void> {
    const tokenHash = this.hashToken(dto.refreshToken);
    const storedToken =
      await this.authRepository.findRefreshTokenByHash(tokenHash);

    if (!storedToken || storedToken.revokedAt) {
      throw new UnauthorizedException(INVALID_REFRESH_TOKEN_MESSAGE);
    }

    await this.authRepository.revokeRefreshToken(storedToken.id);
  }

  // Verifies a raw access-token string and resolves the user it belongs to —
  // used by the WebSocket gateway's handshake, which has no HTTP request/
  // Authorization header for Passport's JwtStrategy to read, so it can't
  // reuse AuthGuard('jwt') as-is. Mirrors JwtStrategy.validate() exactly,
  // including going through the same cached lookup below.
  async verifyAccessToken(token: string): Promise<UserResponseDto> {
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.configService.get('jwt', { infer: true }).accessSecret,
      });
      const user = await this.getCachedUser(payload.sub);
      if (!user) {
        throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
      }
      return user;
    } catch {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }
  }

  // Backs both verifyAccessToken above and JwtStrategy.validate() — i.e.
  // every authenticated HTTP request and WS handshake in the app resolves
  // its current user through here, since JwtStrategy calls this instead of
  // AuthRepository directly. Worth caching precisely because it's on that
  // hot path, not just /auth/me. No explicit invalidation hook exists yet
  // (TTL-only) because there's no profile-edit endpoint that could make a
  // cached entry stale — wire one up here if that ever changes.
  async getCachedUser(id: string): Promise<UserResponseDto | null> {
    const cacheKey = cacheKeys.authUser(id);
    const cached = await this.redisService.get<UserResponseDto>(cacheKey);
    if (cached) {
      return cached;
    }

    const user = await this.authRepository.findById(id);
    if (!user) {
      return null;
    }

    const dto = new UserResponseDto(user);
    await this.redisService.set(cacheKey, dto);
    return dto;
  }

  private async issueTokens(user: User): Promise<AuthTokensDto> {
    const accessToken = await this.signAccessToken(user);
    const refreshMaterial = this.createRefreshTokenMaterial();

    await this.authRepository.createRefreshToken({
      userId: user.id,
      tokenHash: refreshMaterial.tokenHash,
      expiresAt: refreshMaterial.expiresAt,
    });

    return new AuthTokensDto({
      accessToken,
      refreshToken: refreshMaterial.token,
    });
  }

  private signAccessToken(user: User): Promise<string> {
    return this.jwtService.signAsync({ sub: user.id, email: user.email });
  }

  private createRefreshTokenMaterial(): {
    token: string;
    tokenHash: string;
    expiresAt: Date;
  } {
    const token = randomBytes(64).toString('hex');
    const { refreshExpiresIn } = this.configService.get('jwt', {
      infer: true,
    });

    return {
      token,
      tokenHash: this.hashToken(token),
      expiresAt: new Date(Date.now() + ms(refreshExpiresIn as ms.StringValue)),
    };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
