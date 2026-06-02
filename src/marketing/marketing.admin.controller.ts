import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminModule, MarketingPlatform } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { PermissionsGuard } from '../rbac/permissions.guard';
import { RequirePermission } from '../rbac/require-permission.decorator';
import { UpdateMarketingSettingsDto } from './dto/update-marketing-settings.dto';
import { MarketingService } from './marketing.service';

@Controller('v1/admin/marketing')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('ADMIN', 'STAFF')
export class MarketingAdminController {
  constructor(private readonly marketingService: MarketingService) {}

  @Get()
  @RequirePermission(AdminModule.MARKETING, 'view')
  getHub(@Query('periodDays') periodDays?: string) {
    const days = periodDays ? Number(periodDays) : 30;
    return this.marketingService.getHub(days);
  }

  @Patch('settings')
  @RequirePermission(AdminModule.MARKETING, 'edit')
  updateSettings(@Body() dto: UpdateMarketingSettingsDto) {
    return this.marketingService.updateSettings(dto);
  }

  @Post('connections/:platform/disconnect')
  @RequirePermission(AdminModule.MARKETING, 'edit')
  disconnect(@Param('platform') platform: MarketingPlatform) {
    return this.marketingService.disconnect(platform);
  }

  @Post('connections/:platform/refresh')
  @RequirePermission(AdminModule.MARKETING, 'edit')
  refresh(
    @Param('platform') platform: MarketingPlatform,
    @Query('periodDays') periodDays?: string,
  ) {
    const days = periodDays ? Number(periodDays) : 30;
    return this.marketingService.refreshPlatform(platform, days);
  }
}
