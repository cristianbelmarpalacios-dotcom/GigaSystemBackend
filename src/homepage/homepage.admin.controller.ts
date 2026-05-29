import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AdminModule, HomeSectionType } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { PermissionsGuard } from '../rbac/permissions.guard';
import { RequirePermission } from '../rbac/require-permission.decorator';
import { CreateHomeSlideDto } from './dto/create-home-slide.dto';
import { UpsertHomePromoDto } from './dto/upsert-home-promo.dto';
import { UpsertHomeSectionDto } from './dto/upsert-home-section.dto';
import { UpsertHomeTileDto } from './dto/upsert-home-tile.dto';
import { HomepageService } from './homepage.service';

@Controller('v1/admin/homepage')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('ADMIN', 'STAFF')
export class HomepageAdminController {
  constructor(private readonly homepageService: HomepageService) {}

  @Get()
  @RequirePermission(AdminModule.HOMEPAGE, 'view')
  list() {
    return this.homepageService.listAdmin();
  }

  @Patch('sections/:type')
  @RequirePermission(AdminModule.HOMEPAGE, 'edit')
  updateSection(
    @Param('type') type: HomeSectionType,
    @Body() dto: UpsertHomeSectionDto,
  ) {
    return this.homepageService.updateSection(type, dto);
  }

  @Post('sections/:type/slides')
  @RequirePermission(AdminModule.HOMEPAGE, 'edit')
  addSlide(
    @Param('type') type: HomeSectionType,
    @Body() dto: CreateHomeSlideDto,
  ) {
    return this.homepageService.addSlide(type, dto);
  }

  @Patch('slides/:id')
  @RequirePermission(AdminModule.HOMEPAGE, 'edit')
  updateSlide(@Param('id') id: string, @Body() dto: CreateHomeSlideDto) {
    return this.homepageService.updateSlide(id, dto);
  }

  @Delete('slides/:id')
  @RequirePermission(AdminModule.HOMEPAGE, 'delete')
  deleteSlide(@Param('id') id: string) {
    return this.homepageService.deleteSlide(id);
  }

  @Post('sections/:type/promo')
  @RequirePermission(AdminModule.HOMEPAGE, 'edit')
  upsertPromoPost(
    @Param('type') type: HomeSectionType,
    @Body() dto: UpsertHomePromoDto,
  ) {
    return this.homepageService.upsertPromo(type, dto);
  }

  @Post('sections/:type/tiles')
  @RequirePermission(AdminModule.HOMEPAGE, 'edit')
  upsertTile(
    @Param('type') type: HomeSectionType,
    @Body() dto: UpsertHomeTileDto,
  ) {
    return this.homepageService.upsertTile(type, dto);
  }

  @Delete('tiles/:id')
  @RequirePermission(AdminModule.HOMEPAGE, 'delete')
  deleteTile(@Param('id') id: string) {
    return this.homepageService.deleteTile(id);
  }

  @Post('upload-image')
  @RequirePermission(AdminModule.HOMEPAGE, 'edit')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }),
  )
  uploadImage(@UploadedFile() file: Express.Multer.File) {
    return this.homepageService.uploadImage(file);
  }
}