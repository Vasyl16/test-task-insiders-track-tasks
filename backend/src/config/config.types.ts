export interface JwtConfig {
  accessSecret: string;
  accessExpiresIn: string;
  refreshExpiresIn: string;
}

export interface EmailConfig {
  from: string;
  token: string;
}

export interface AppConfig {
  port: number;
  databaseUrl: string;
  corsOrigin: string;
  jwt: JwtConfig;
  email: EmailConfig;
}
