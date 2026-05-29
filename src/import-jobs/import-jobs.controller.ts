import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ImportJobsService } from './import-jobs.service';

@Controller('v1/admin/import-jobs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'STAFF')
export class ImportJobsController {
  constructor(private readonly importJobsService: ImportJobsService) {}

  @Post()
  create(@Body() body: { csvContent: string; fileKey?: string }) {
    return this.importJobsService.create(body.csvContent, body.fileKey);
  }

  @Get()
  list() {
    return this.importJobsService.list();
  }
}
