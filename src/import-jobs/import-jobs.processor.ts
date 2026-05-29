import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { parse } from 'csv-parse/sync';
import { CatalogService } from '../catalog/catalog.service';
import { Prisma, ProductType } from '@prisma/client';

@Injectable()
@Processor('import-jobs')
export class ImportJobsProcessor extends WorkerHost {
  constructor(
    private readonly prisma: PrismaService,
    private readonly catalogService: CatalogService,
  ) {
    super();
  }

  async process(
    job: Job<{ importJobId: string; csvContent: string }>,
  ): Promise<void> {
    const importJobId = job.data.importJobId;
    await this.prisma.importJob.update({
      where: { id: importJobId },
      data: { status: 'PROCESSING', startedAt: new Date() },
    });

    const rows = parse(job.data.csvContent, {
      columns: true,
      skip_empty_lines: true,
    });
    let successRows = 0;
    let errorRows = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i] as Record<string, unknown>;
      const name = typeof row.name === 'string' ? row.name : '';
      const slug = typeof row.slug === 'string' ? row.slug : '';
      const type = typeof row.type === 'string' ? row.type : '';
      const description =
        typeof row.description === 'string' ? row.description : undefined;
      try {
        await this.catalogService.createProduct({
          name,
          slug,
          type: this.toProductType(type),
          description,
        });
        successRows++;
        await this.prisma.importJobRow.create({
          data: {
            importJobId,
            rowNumber: i + 1,
            payload: row as Prisma.InputJsonValue,
            status: 'SUCCESS',
          },
        });
      } catch (error) {
        errorRows++;
        await this.prisma.importJobRow.create({
          data: {
            importJobId,
            rowNumber: i + 1,
            payload: row as Prisma.InputJsonValue,
            status: 'ERROR',
            error: error instanceof Error ? error.message : 'Error desconocido',
          },
        });
      }
    }

    await this.prisma.importJob.update({
      where: { id: importJobId },
      data: {
        status: 'DONE',
        totalRows: rows.length,
        successRows,
        errorRows,
        finishedAt: new Date(),
      },
    });
  }

  private toProductType(rawType: string): ProductType {
    if (rawType in ProductType) {
      return rawType as ProductType;
    }
    return ProductType.PC_COMPONENT;
  }
}
