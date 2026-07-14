import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthRepository } from './auth.repository';
import { AuthService } from './auth.service';
import { PrismaService } from '@prisma/prisma.service';

@Module({
  controllers: [AuthController],
  providers: [AuthService, AuthRepository, PrismaService],
  exports: [AuthService],
})
export class AuthModule {}
