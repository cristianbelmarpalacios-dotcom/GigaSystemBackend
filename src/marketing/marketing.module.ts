import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RbacModule } from '../rbac/rbac.module';
import { MarketingAdminController } from './marketing.admin.controller';
import { MarketingMetricsService } from './marketing-metrics.service';
import { MarketingOAuthController } from './marketing-oauth.controller';
import { MarketingOAuthService } from './marketing-oauth.service';
import { MarketingService } from './marketing.service';

@Module({
  imports: [AuthModule, RbacModule],
  providers: [
    MarketingService,
    MarketingOAuthService,
    MarketingMetricsService,
  ],
  controllers: [MarketingAdminController, MarketingOAuthController],
})
export class MarketingModule {}
