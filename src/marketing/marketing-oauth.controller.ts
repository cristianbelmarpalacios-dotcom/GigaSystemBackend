import {
  Controller,
  Get,
  Param,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AdminModule, MarketingPlatform } from '@prisma/client';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { PermissionsGuard } from '../rbac/permissions.guard';
import { RequirePermission } from '../rbac/require-permission.decorator';
import { getMarketingEnv } from './marketing-oauth.config';
import { MarketingOAuthService } from './marketing-oauth.service';

@Controller('v1/admin/marketing/oauth')
export class MarketingOAuthController {
  constructor(private readonly oauthService: MarketingOAuthService) {}

  @Get('providers')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'STAFF')
  @RequirePermission(AdminModule.MARKETING, 'view')
  providers() {
    return this.oauthService.getProviderStatus();
  }

  @Get('callback')
  async callback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') oauthError: string | undefined,
    @Query('error_description') errorDescription: string | undefined,
    @Res() res: Response,
  ) {
    const { adminAppUrl } = getMarketingEnv();
    const base = `${adminAppUrl}/admin/marketing`;

    if (oauthError || !code || !state) {
      const msg = encodeURIComponent(
        errorDescription ?? oauthError ?? 'Autorización cancelada',
      );
      res.redirect(`${base}?oauth=error&message=${msg}`);
      return;
    }

    try {
      const result = await this.oauthService.handleOAuthCallback(code, state);
      res.redirect(
        `${base}?oauth=success&platform=${encodeURIComponent(result.platform)}`,
      );
    } catch (err) {
      const msg = encodeURIComponent(
        err instanceof Error ? err.message : 'Error OAuth',
      );
      res.redirect(`${base}?oauth=error&message=${msg}`);
    }
  }

  @Get(':platform/start')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'STAFF')
  @RequirePermission(AdminModule.MARKETING, 'edit')
  start(
    @Param('platform') platform: MarketingPlatform,
    @Req() req: { user: { userId: string } },
  ) {
    const url = this.oauthService.createAuthorizationUrl(
      platform,
      req.user.userId,
    );
    return { url };
  }
}
