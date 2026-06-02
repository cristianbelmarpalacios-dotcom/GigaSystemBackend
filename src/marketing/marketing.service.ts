import { BadRequestException, Injectable } from '@nestjs/common';
import {
  MarketingConnectionStatus,
  MarketingPlatform,
  OrderStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { UpdateMarketingSettingsDto } from './dto/update-marketing-settings.dto';
import { MarketingMetricsService } from './marketing-metrics.service';
import { PLATFORM_OAUTH } from './marketing-oauth.config';
import { MarketingOAuthService } from './marketing-oauth.service';

const ALL_PLATFORMS: MarketingPlatform[] = [
  MarketingPlatform.GOOGLE_ADS,
  MarketingPlatform.META_ADS,
  MarketingPlatform.GOOGLE_ANALYTICS,
  MarketingPlatform.META_PIXEL,
  MarketingPlatform.TIKTOK_ADS,
];

const PAID_STATUSES: OrderStatus[] = [
  OrderStatus.PAID,
  OrderStatus.PROCESSING,
  OrderStatus.SHIPPED,
  OrderStatus.DELIVERED,
];

@Injectable()
export class MarketingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly oauthService: MarketingOAuthService,
    private readonly metricsService: MarketingMetricsService,
  ) {}

  async getHub(periodDays = 30) {
    const days = this.normalizePeriod(periodDays);
    await this.ensureDefaults();

    const [settings, connections] = await Promise.all([
      this.prisma.marketingSettings.findUniqueOrThrow({
        where: { id: 'default' },
      }),
      this.prisma.marketingPlatformConnection.findMany({
        orderBy: { platform: 'asc' },
      }),
    ]);

    const storeMetrics = await this.buildStoreMetrics(days);
    const oauth = this.oauthService.getProviderStatus();

    const enriched = await Promise.all(
      connections.map(async (c) => {
        const metrics = await this.metricsService.resolveMetrics(
          c.platform,
          c.status,
          c.config,
          days,
          storeMetrics.paidRevenue,
        );
        return {
          ...c,
          metrics,
          oauthSupported: Boolean(PLATFORM_OAUTH[c.platform]),
          syncAvailable:
            c.status === MarketingConnectionStatus.CONNECTED &&
            Boolean(PLATFORM_OAUTH[c.platform]),
        };
      }),
    );

    let totalAdSpend = 0;
    let totalClicks = 0;
    let totalImpressions = 0;
    let hasAdsMetrics = false;

    for (const c of enriched) {
      if (c.metrics.available && c.metrics.spend != null) {
        hasAdsMetrics = true;
        totalAdSpend += c.metrics.spend;
        totalClicks += c.metrics.clicks ?? 0;
        totalImpressions += c.metrics.impressions ?? 0;
      }
    }

    const combinedRoas =
      hasAdsMetrics && totalAdSpend > 0
        ? Math.round((storeMetrics.paidRevenue / totalAdSpend) * 100) / 100
        : null;

    const connectedCount = enriched.filter(
      (c) => c.status === MarketingConnectionStatus.CONNECTED,
    ).length;

    return {
      settings,
      connections: enriched,
      storeMetrics,
      oauth,
      summary: {
        periodDays: days,
        connectedPlatforms: connectedCount,
        totalPlatforms: ALL_PLATFORMS.length,
        adsDataAvailable: hasAdsMetrics,
        trackingConfigured: Boolean(
          settings.gtmContainerId ||
          settings.ga4MeasurementId ||
          settings.metaPixelId,
        ),
        totalAdSpend,
        totalClicks,
        totalImpressions,
        combinedRoas,
      },
      generatedAt: new Date().toISOString(),
    };
  }

  async updateSettings(dto: UpdateMarketingSettingsDto) {
    await this.ensureDefaults();
    const data: Prisma.MarketingSettingsUpdateInput = {};

    if (dto.trackingEnabled !== undefined) {
      data.trackingEnabled = dto.trackingEnabled;
    }
    if (dto.currency !== undefined) data.currency = dto.currency.trim();
    if (dto.gtmContainerId !== undefined) {
      data.gtmContainerId = this.normalizeOptionalId(dto.gtmContainerId);
    }
    if (dto.ga4MeasurementId !== undefined) {
      data.ga4MeasurementId = this.normalizeOptionalId(dto.ga4MeasurementId);
    }
    if (dto.metaPixelId !== undefined) {
      data.metaPixelId = this.normalizeOptionalId(dto.metaPixelId);
    }
    if (dto.googleAdsConversionId !== undefined) {
      data.googleAdsConversionId = this.normalizeOptionalId(
        dto.googleAdsConversionId,
      );
    }
    if (dto.googleAdsConversionLabel !== undefined) {
      data.googleAdsConversionLabel = this.normalizeOptionalId(
        dto.googleAdsConversionLabel,
      );
    }
    if (dto.tiktokPixelId !== undefined) {
      data.tiktokPixelId = this.normalizeOptionalId(dto.tiktokPixelId);
    }
    if (dto.notes !== undefined) {
      data.notes = dto.notes?.trim() || null;
    }

    const settings = await this.prisma.marketingSettings.update({
      where: { id: 'default' },
      data,
    });

    if (dto.metaPixelId !== undefined) {
      const pixelId = settings.metaPixelId;
      const metaAds = await this.prisma.marketingPlatformConnection.findUnique({
        where: { platform: MarketingPlatform.META_ADS },
      });
      await this.prisma.marketingPlatformConnection.update({
        where: { platform: MarketingPlatform.META_PIXEL },
        data: {
          status:
            pixelId || metaAds?.status === MarketingConnectionStatus.CONNECTED
              ? MarketingConnectionStatus.CONNECTED
              : MarketingConnectionStatus.DISCONNECTED,
          accountName: pixelId ? `Pixel ${pixelId}` : null,
          connectedAt: pixelId ? new Date() : null,
        },
      });
    }

    return settings;
  }

  async disconnect(platform: MarketingPlatform) {
    if (!ALL_PLATFORMS.includes(platform)) {
      throw new BadRequestException('Plataforma no válida');
    }
    await this.ensureDefaults();

    await this.prisma.marketingPlatformConnection.update({
      where: { platform },
      data: {
        status: MarketingConnectionStatus.DISCONNECTED,
        accountName: null,
        accountExternalId: null,
        lastError: null,
        connectedAt: null,
        lastSyncAt: null,
        config: Prisma.DbNull,
      },
    });

    if (platform === MarketingPlatform.META_ADS) {
      const settings = await this.prisma.marketingSettings.findUnique({
        where: { id: 'default' },
      });
      if (!settings?.metaPixelId) {
        await this.prisma.marketingPlatformConnection.update({
          where: { platform: MarketingPlatform.META_PIXEL },
          data: {
            status: MarketingConnectionStatus.DISCONNECTED,
            accountName: null,
            connectedAt: null,
          },
        });
      }
    }
  }

  async refreshPlatform(platform: MarketingPlatform, periodDays = 30) {
    const days = this.normalizePeriod(periodDays);
    const conn = await this.prisma.marketingPlatformConnection.findUnique({
      where: { platform },
    });
    if (!conn || conn.status !== MarketingConnectionStatus.CONNECTED) {
      throw new BadRequestException('La plataforma no está conectada');
    }

    const store = await this.buildStoreMetrics(days);
    const config = conn.config as Record<string, unknown> | null;
    if (config && typeof config === 'object') {
      delete config.cachedMetrics;
      await this.prisma.marketingPlatformConnection.update({
        where: { platform },
        data: { config: config as Prisma.InputJsonValue },
      });
    }

    return this.metricsService.resolveMetrics(
      platform,
      conn.status,
      conn.config,
      days,
      store.paidRevenue,
    );
  }

  private normalizePeriod(days: number) {
    if (!Number.isFinite(days) || days < 1) return 30;
    return Math.min(90, Math.max(7, Math.floor(days)));
  }

  private normalizeOptionalId(value: string | null | undefined) {
    const v = value?.trim();
    return v ? v : null;
  }

  private async ensureDefaults() {
    await this.prisma.marketingSettings.upsert({
      where: { id: 'default' },
      update: {},
      create: { id: 'default' },
    });

    for (const platform of ALL_PLATFORMS) {
      await this.prisma.marketingPlatformConnection.upsert({
        where: { platform },
        update: {},
        create: { platform },
      });
    }
  }

  private async buildStoreMetrics(periodDays: number) {
    const since = new Date();
    since.setDate(since.getDate() - periodDays);
    since.setHours(0, 0, 0, 0);

    const orders = await this.prisma.order.findMany({
      where: { createdAt: { gte: since } },
      select: {
        status: true,
        grandTotal: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    let paidOrders = 0;
    let paidRevenue = 0;
    let awaitingPayment = 0;
    let cancelled = 0;

    const byDay = new Map<string, { orders: number; revenue: number }>();

    for (const o of orders) {
      const key = o.createdAt.toISOString().slice(0, 10);
      const day = byDay.get(key) ?? { orders: 0, revenue: 0 };

      if (PAID_STATUSES.includes(o.status)) {
        paidOrders += 1;
        const amount = Number(o.grandTotal);
        paidRevenue += amount;
        day.orders += 1;
        day.revenue += amount;
      } else if (o.status === OrderStatus.AWAITING_PAYMENT) {
        awaitingPayment += 1;
      } else if (o.status === OrderStatus.CANCELLED) {
        cancelled += 1;
      }

      byDay.set(key, day);
    }

    const dailySeries = Array.from(byDay.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({
        date,
        orders: v.orders,
        revenue: Math.round(v.revenue),
      }));

    const avgOrderValue = paidOrders > 0 ? paidRevenue / paidOrders : 0;
    const conversionRate =
      awaitingPayment + paidOrders > 0
        ? Math.round((paidOrders / (awaitingPayment + paidOrders)) * 1000) / 10
        : null;

    return {
      source: 'store_orders' as const,
      available: true,
      periodDays,
      paidOrders,
      paidRevenue: Math.round(paidRevenue),
      awaitingPayment,
      cancelled,
      avgOrderValue: Math.round(avgOrderValue),
      conversionRate,
      dailySeries,
      funnel: {
        checkoutsStarted: awaitingPayment + paidOrders,
        purchases: paidOrders,
        awaitingPayment,
      },
    };
  }
}
