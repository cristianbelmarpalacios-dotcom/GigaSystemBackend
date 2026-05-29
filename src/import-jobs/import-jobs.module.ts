import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ImportJobsService } from './import-jobs.service';
import { ImportJobsController } from './import-jobs.controller';
import { ImportJobsProcessor } from './import-jobs.processor';
import { CatalogModule } from '../catalog/catalog.module';

@Module({
  imports: [BullModule.registerQueue({ name: 'import-jobs' }), CatalogModule],
  providers: [ImportJobsService, ImportJobsProcessor],
  controllers: [ImportJobsController],
})
export class ImportJobsModule {}
