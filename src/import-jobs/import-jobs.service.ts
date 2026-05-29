import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class ImportJobsService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('import-jobs') private readonly queue: Queue,
  ) {}

  async create(csvContent: string, fileKey = 'manual-upload.csv') {
    const importJob = await this.prisma.importJob.create({
      data: { fileKey, status: 'PENDING' },
    });
    await this.queue.add('catalog-csv', {
      importJobId: importJob.id,
      csvContent,
    });
    return importJob;
  }

  list() {
    return this.prisma.importJob.findMany({
      include: { rows: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }
}
