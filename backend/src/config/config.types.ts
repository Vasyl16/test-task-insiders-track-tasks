export interface JwtConfig {
  accessSecret: string;
  accessExpiresIn: string;
  refreshSecret: string;
  refreshExpiresIn: string;
}

export interface AppConfig {
  port: number;
  databaseUrl: string;
  corsOrigin: string;
  jwt: JwtConfig;
}
