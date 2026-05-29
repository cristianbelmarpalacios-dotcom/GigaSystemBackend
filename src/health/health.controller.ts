import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { PrismaService } from '../database/prisma.service';
import Redis from 'ioredis';
import { S3Client, HeadBucketCommand } from '@aws-sdk/client-s3';
import { createClient } from '@supabase/supabase-js';

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      async () => {
        await this.prisma.$queryRaw`SELECT 1`;
        return { db: { status: 'up' } };
      },
      async () => {
        const redis = new Redis(
          this.configService.getOrThrow<string>('REDIS_URL'),
        );
        await redis.ping();
        await redis.quit();
        return { redis: { status: 'up' } };
      },
      async () => {
        const provider =
          this.configService.get<string>('STORAGE_PROVIDER') ?? 'supabase';

        if (provider === 'supabase') {
          const supabase = createClient(
            this.configService.getOrThrow<string>('SUPABASE_URL'),
            this.configService.getOrThrow<string>('SUPABASE_SERVICE_ROLE_KEY'),
          );
          const bucket = this.configService.getOrThrow<string>(
            'SUPABASE_STORAGE_BUCKET',
          );
          const { error } = await supabase.storage.from(bucket).list('', {
            limit: 1,
          });
          if (error) throw error;
          return { storage: { status: 'up', provider: 'supabase' } };
        }

        const s3 = new S3Client({
          endpoint: this.configService.getOrThrow<string>('S3_ENDPOINT'),
          region: this.configService.getOrThrow<string>('S3_REGION'),
          forcePathStyle:
            this.configService.get<string>('S3_FORCE_PATH_STYLE') === 'true',
          credentials: {
            accessKeyId: this.configService.getOrThrow<string>('S3_ACCESS_KEY'),
            secretAccessKey:
              this.configService.getOrThrow<string>('S3_SECRET_KEY'),
          },
        });
        await s3.send(
          new HeadBucketCommand({
            Bucket: this.configService.getOrThrow<string>('S3_BUCKET'),
          }),
        );
        return { storage: { status: 'up', provider: 's3' } };
      },
    ]);
  }
}
