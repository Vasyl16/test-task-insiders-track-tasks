import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

type PrismaClientLike = {
  $connect(): Promise<void>;
  $disconnect(): Promise<void>;
};

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly client: PrismaClientLike = {
    $connect: async () => undefined,
    $disconnect: async () => undefined,
  };

  async onModuleInit(): Promise<void> {
    await this.client.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.$disconnect();
  }
}
