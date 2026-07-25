import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AppConfig } from '@config/config.types';
import { AuthService } from '../auth.service';
import { UserResponseDto } from '../dto/user-response.dto';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService<AppConfig, true>,
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('jwt', { infer: true }).accessSecret,
    });
  }

  // Delegates to AuthService.getCachedUser (Redis-cached, see that method's
  // comment) rather than calling AuthRepository directly — this runs on
  // every single authenticated request in the app.
  async validate(payload: JwtPayload): Promise<UserResponseDto> {
    const user = await this.authService.getCachedUser(payload.sub);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }
}
