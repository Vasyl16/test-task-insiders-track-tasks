import { plainToInstance } from 'class-transformer';
import { IsNotEmpty, IsString, MinLength, validateSync } from 'class-validator';

class EnvironmentVariables {
  @IsString()
  @IsNotEmpty()
  DATABASE_URL!: string;

  @IsString()
  @MinLength(32, {
    message: 'JWT_ACCESS_SECRET must be at least 32 characters long',
  })
  JWT_ACCESS_SECRET!: string;
}

// Runs once at ConfigModule initialization, before any provider is
// constructed - a missing/weak secret fails the app at boot instead of on
// the first request that happens to need it. Returns the original config
// object (not the validated instance) rather than relying on
// @nestjs/config's assignVariablesToProcess only back-filling missing keys:
// this way nothing else in process.env can be silently dropped regardless
// of that implementation detail.
export function validateEnv(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });

  if (errors.length > 0) {
    const messages = errors
      .map((error) => Object.values(error.constraints ?? {}).join(', '))
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${messages}`);
  }

  return config;
}
