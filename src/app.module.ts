import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { AuthModule } from './auth/auth.module';
import { RbacModule } from './rbac/rbac.module';
import { CatalogModule } from './catalog/catalog.module';
import EnvVars from './config/env.validation';
import { PrismaModule } from './database/prisma.module';
import { HealthModule } from './health/health.module';
import { ImportJobsModule } from './import-jobs/import-jobs.module';
import { HomepageModule } from './homepage/homepage.module';
import { InventoryModule } from './inventory/inventory.module';
import { MediaModule } from './media/media.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';

function validate(config: Record<string, unknown>) {
  const validated = plainToInstance(EnvVars, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length) {
    const lines = errors.flatMap((e) =>
      e.constraints ? Object.values(e.constraints) : [],
    );
    throw new Error(`Revisa GigaSystem-backend/.env:\n${lines.join('\n')}`);
  }

  return validated;
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate }),
    BullModule.forRoot({
      connection: { url: process.env.REDIS_URL },
    }),
    PrismaModule,
    HealthModule,
    CatalogModule,
    MediaModule,
    InventoryModule,
    AuthModule,
    RbacModule,
    OrdersModule,
    PaymentsModule,
    ImportJobsModule,
    HomepageModule,
  ],
})
export class AppModule {}
