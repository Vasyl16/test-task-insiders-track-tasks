import { AppConfig } from './config.types';

export default (): AppConfig => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  // Presence enforced at startup by validateEnv - see the jwt block below.
  databaseUrl: process.env.DATABASE_URL!,
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  jwt: {
    // Presence and minimum length are enforced at startup by validateEnv
    // (src/config/env.validation.ts) - no insecure fallback here on purpose.
    accessSecret: process.env.JWT_ACCESS_SECRET!,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  email: {
    from: process.env.EMAIL_FROM || '',
    token: process.env.EMAIL_TOKEN || '',
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    cacheTtlSeconds: parseInt(
      process.env.CACHE_TTL_SECONDS ?? `${30 * 60}`,
      10,
    ),
  },
  throttle: {
    ttlMs: parseInt(process.env.THROTTLE_TTL_MS ?? '60000', 10),
    limit: parseInt(process.env.THROTTLE_LIMIT ?? '10', 10),
  },
});
