import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { AppConfig } from '@config/config.types';

// Cache-aside helper shared by every module that wants to cache a read.
// Every method below swallows its own errors and degrades to a cache
// miss/no-op instead of failing the request - caching is a performance
// optimization here, never a correctness dependency, so a Redis outage
// should make responses slower (straight to Postgres), not break the API.
@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis;
  private readonly defaultTtlSeconds: number;

  constructor(configService: ConfigService<AppConfig, true>) {
    const { url, cacheTtlSeconds } = configService.get('redis', {
      infer: true,
    });
    this.defaultTtlSeconds = cacheTtlSeconds;
    this.client = new Redis(url, {
      // Fail a single command fast instead of ioredis's default of retrying
      // it up to 20 times - a slow/absent Redis should never make requests
      // hang, only skip caching for that request.
      maxRetriesPerRequest: 1,
      connectTimeout: 5000,
      retryStrategy: (times) => Math.min(times * 200, 2000),
    });
    this.client.on('error', (error) => {
      this.logger.warn(`Redis connection error: ${error.message}`);
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit().catch(() => undefined);
  }

  async get<T>(key: string): Promise<T | undefined> {
    try {
      const raw = await this.client.get(key);
      return raw === null ? undefined : (JSON.parse(raw) as T);
    } catch (error) {
      this.logger.warn(`GET "${key}" failed: ${this.messageOf(error)}`);
      return undefined;
    }
  }

  async set(
    key: string,
    value: unknown,
    ttlSeconds: number = this.defaultTtlSeconds,
  ): Promise<void> {
    try {
      await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch (error) {
      this.logger.warn(`SET "${key}" failed: ${this.messageOf(error)}`);
    }
  }

  async del(...keys: string[]): Promise<void> {
    if (keys.length === 0) {
      return;
    }
    try {
      await this.client.del(...keys);
    } catch (error) {
      this.logger.warn(
        `DEL "${keys.join(', ')}" failed: ${this.messageOf(error)}`,
      );
    }
  }

  // Invalidates a whole family of list-query cache entries at once (e.g.
  // every page/filter/sort combination cached under
  // "workspaces:list:<userId>:") - SCAN rather than KEYS so this never
  // blocks Redis on a large keyspace.
  async delByPrefix(prefix: string): Promise<void> {
    try {
      const stream = this.client.scanStream({
        match: `${prefix}*`,
        count: 100,
      });
      const pipeline = this.client.pipeline();
      let matched = false;
      for await (const keys of stream as AsyncIterable<string[]>) {
        for (const key of keys) {
          matched = true;
          pipeline.del(key);
        }
      }
      if (matched) {
        await pipeline.exec();
      }
    } catch (error) {
      this.logger.warn(
        `Prefix delete "${prefix}*" failed: ${this.messageOf(error)}`,
      );
    }
  }

  // Used by the /health Redis indicator only - unlike the methods above,
  // callers there want to know if Redis is actually reachable.
  async ping(): Promise<void> {
    await this.client.ping();
  }

  private messageOf(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
