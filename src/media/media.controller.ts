import {
  Body,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { MediaService } from './media.service';
import { CreateUploadUrlDto } from './dto/create-upload-url.dto';
import { CompleteUploadDto } from './dto/complete-upload.dto';
import { AdminModule, ImageRole } from '@prisma/client';
import { PermissionsGuard } from '../rbac/permissions.guard';
import { RequirePermission } from '../rbac/require-permission.decorator';

@Controller('v1/admin/media')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('ADMIN', 'STAFF')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('upload-url')
  @RequirePermission(AdminModule.PRODUCTS, 'edit')
  createUploadUrl(@Body() dto: CreateUploadUrlDto) {
    return this.mediaService.createUploadUrl(dto);
  }

  @Post('complete-image')
  @RequirePermission(AdminModule.PRODUCTS, 'edit')
  completeImageUpload(@Body() dto: CompleteUploadDto) {
    return this.mediaService.completeImageUpload(dto);
  }

  @Post('upload-image')
  @RequirePermission(AdminModule.PRODUCTS, 'edit')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }),
  )
  uploadImageDirect(
    @UploadedFile() file: Express.Multer.File,
    @Body('productId') productId: string,
    @Body('role') role?: ImageRole,
  ) {
    return this.mediaService.uploadImageDirect(productId, file, role);
  }

  @Post('image-url')
  @RequirePermission(AdminModule.PRODUCTS, 'edit')
  addImageUrl(
    @Body() body: { productId: string; url: string; role?: ImageRole },
  ) {
    return this.mediaService.addExternalImageUrl(
      body.productId,
      body.url,
      body.role ?? ImageRole.DETAIL,
    );
  }
}
