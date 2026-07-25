export interface JwtConfig {
  accessSecret: string;
  accessExpiresIn: string;
  refreshExpiresIn: string;
}

export interface EmailConfig {
  from: string;
  token: string;
}

export interface RedisConfig {
  url: string;
  // Default TTL applied to any cache entry that doesn't specify its own.
  cacheTtlSeconds: number;
}

export interface ThrottleConfig {
  ttlMs: number;
  limit: number;
}

export interface AppConfig {
  port: number;
  databaseUrl: string;
  corsOrigin: string;
  jwt: JwtConfig;
  email: EmailConfig;
  redis: RedisConfig;
  throttle: ThrottleConfig;
}
