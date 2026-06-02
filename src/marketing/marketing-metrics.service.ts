import { Injectable } from '@nestjs/common';
import {
  MarketingConnectionStatus,
  MarketingPlatform,
} from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { getMarketingEnv } from './marketing-oauth.config';
import { StoredOAuthConfig } from './marketing-oauth.service';

export type PlatformMetricsDto = {
  available: boolean;
  source: 'not_connected' | 'syncing' | 'api' | 'config_only';
  spend: number | null;
  reach: number | null;
  impressions: number | null;
  clicks: number | null;
  linkClicks: number | null;
  engagement: number | null;
  conversions: number | null;
  revenue: number | null;
  roas: number | null;
  ctr: number | null;
  cpc: number | null;
  cpm: number | null;
  frequency: number | null;
  message?: string;
};

type MetricsSnapshot = {
  spend: number;
  reach: number;
  impressions: number;
  clicks: number;
  linkClicks: number;
  engagement: number;
  conversions: number;
  ctr: number;
  cpc: number;
  cpm: number;
  frequency: number;
  roas: number | null;
  syncedAt: string;
};

const SYNC_TTL_MS = 15 * 60 * 1000;

const PURCHASE_ACTIONS = [
  'purchase',
  'omni_purchase',
  'offsite_conversion.fb_pixel_purchase',
  'web_in_store_purchase',
];

const LINK_CLICK_ACTIONS = ['link_click', 'outbound_click'];

const ENGAGEMENT_ACTIONS = [
  'post_engagement',
  'page_engagement',
  'post_reaction',
  'comment',
  'video_view',
  'onsite_conversion.post_save',
];

@Injectable()
export class MarketingMetricsService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveMetrics(
    platform: MarketingPlatform,
    status: MarketingConnectionStatus,
    config: unknown,
    periodDays: number,
    storeRevenue: number,
  ): Promise<PlatformMetricsDto> {
    if (status !== MarketingConnectionStatus.CONNECTED) {
      return this.empty('not_connected');
    }

    if (platform === MarketingPlatform.META_PIXEL) {
      return {
        available: true,
        source: 'config_only',
        spend: null,
        reach: null,
        impressions: null,
        clicks: null,
        linkClicks: null,
        engagement: null,
        conversions: null,
        revenue: null,
        roas: null,
        ctr: null,
        cpc: null,
        cpm: null,
        frequency: null,
        message:
          'El pixel registra eventos en tu tienda. Alcance, clics y gasto de campañas están en Meta Ads.',
      };
    }

    if (platform === MarketingPlatform.TIKTOK_ADS) {
      return this.empty(
        'not_connected',
        'TikTok Ads estará disponible pronto.',
      );
    }

    const oauth = config as StoredOAuthConfig | null;
    if (!oauth?.accessToken) {
      return this.empty('not_connected', 'Vuelve a conectar la cuenta');
    }

    const cached = oauth.cachedMetrics;
    if (cached && cached.periodDays === periodDays) {
      const age = Date.now() - new Date(cached.syncedAt).getTime();
      if (age < SYNC_TTL_MS) {
        return this.fromCached(cached);
      }
    }

    try {
      const fresh =
        oauth.provider === 'meta'
          ? await this.fetchMetaInsights(oauth, periodDays)
          : oauth.provider === 'google_ads'
            ? await this.fetchGoogleAdsInsights(oauth, periodDays)
            : null;

      if (!fresh) {
        return {
          available: false,
          source: 'api',
          spend: null,
          reach: null,
          impressions: null,
          clicks: null,
          linkClicks: null,
          engagement: null,
          conversions: null,
          revenue: null,
          roas: null,
          ctr: null,
          cpc: null,
          cpm: null,
          frequency: null,
          message:
            oauth.provider === 'google_analytics'
              ? 'Cuenta vinculada. Próximamente: sesiones y conversiones GA4 aquí.'
              : 'Falta GOOGLE_ADS_DEVELOPER_TOKEN en el servidor para importar métricas de Google Ads.',
        };
      }

      const roas =
        fresh.spend > 0
          ? Math.round((storeRevenue / fresh.spend) * 100) / 100
          : null;

      const metricsPayload: MetricsSnapshot & { periodDays: number } = {
        periodDays,
        ...fresh,
        roas,
        syncedAt: new Date().toISOString(),
      };

      await this.prisma.marketingPlatformConnection.update({
        where: { platform },
        data: {
          lastSyncAt: new Date(),
          lastError: null,
          config: {
            ...oauth,
            cachedMetrics: metricsPayload,
          } as object,
        },
      });

      return this.fromCached(metricsPayload);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Error al sincronizar métricas';
      await this.prisma.marketingPlatformConnection.update({
        where: { platform },
        data: { lastError: message },
      });
      return {
        available: false,
        source: 'api',
        spend: null,
        reach: null,
        impressions: null,
        clicks: null,
        linkClicks: null,
        engagement: null,
        conversions: null,
        revenue: null,
        roas: null,
        ctr: null,
        cpc: null,
        cpm: null,
        frequency: null,
        message,
      };
    }
  }

  private fromCached(
    c: MetricsSnapshot & { periodDays?: number },
  ): PlatformMetricsDto {
    return {
      available: true,
      source: 'api',
      spend: c.spend,
      reach: c.reach,
      impressions: c.impressions,
      clicks: c.clicks,
      linkClicks: c.linkClicks,
      engagement: c.engagement,
      conversions: c.conversions,
      revenue: null,
      roas: c.roas,
      ctr: c.ctr,
      cpc: c.cpc,
      cpm: c.cpm,
      frequency: c.frequency,
    };
  }

  private empty(
    source: PlatformMetricsDto['source'],
    message?: string,
  ): PlatformMetricsDto {
    return {
      available: false,
      source,
      spend: null,
      reach: null,
      impressions: null,
      clicks: null,
      linkClicks: null,
      engagement: null,
      conversions: null,
      revenue: null,
      roas: null,
      ctr: null,
      cpc: null,
      cpm: null,
      frequency: null,
      message,
    };
  }

  private sumActions(
    actions: Array<{ action_type: string; value: string }> | undefined,
    types: string[],
  ) {
    if (!actions?.length) return 0;
    return actions
      .filter((a) => types.includes(a.action_type))
      .reduce((sum, a) => sum + Number(a.value), 0);
  }

  private async fetchMetaInsights(oauth: StoredOAuthConfig, periodDays: number) {
    const accountId = oauth.adAccountId;
    if (!accountId) throw new Error('Sin cuenta publicitaria de Meta');

    const until = new Date();
    const since = new Date();
    since.setDate(since.getDate() - periodDays);

    const params = new URLSearchParams({
      fields:
        'reach,impressions,clicks,spend,ctr,cpc,cpm,frequency,actions,inline_link_clicks',
      time_range: JSON.stringify({
        since: since.toISOString().slice(0, 10),
        until: until.toISOString().slice(0, 10),
      }),
      access_token: oauth.accessToken,
    });

    const res = await fetch(
      `https://graph.facebook.com/v21.0/act_${accountId}/insights?${params}`,
    );
    const json = (await res.json()) as {
      data?: Array<{
        reach?: string;
        impressions?: string;
        clicks?: string;
        spend?: string;
        ctr?: string;
        cpc?: string;
        cpm?: string;
        frequency?: string;
        inline_link_clicks?: string;
        actions?: Array<{ action_type: string; value: string }>;
      }>;
      error?: { message: string };
    };

    if (!res.ok) {
      throw new Error(json.error?.message ?? 'Meta Insights no disponible');
    }

    const row = json.data?.[0];
    const reach = Number(row?.reach ?? 0);
    const impressions = Number(row?.impressions ?? 0);
    const clicks = Number(row?.clicks ?? 0);
    const spend = Math.round(Number(row?.spend ?? 0) * 100) / 100;
    const linkClicks =
      Number(row?.inline_link_clicks ?? 0) ||
      this.sumActions(row?.actions, LINK_CLICK_ACTIONS);
    const engagement = this.sumActions(row?.actions, ENGAGEMENT_ACTIONS);
    const conversions = this.sumActions(row?.actions, PURCHASE_ACTIONS);

    const ctr =
      row?.ctr != null
        ? Math.round(Number(row.ctr) * 100) / 100
        : impressions > 0
          ? Math.round((clicks / impressions) * 10000) / 100
          : 0;
    const cpc =
      row?.cpc != null
        ? Math.round(Number(row.cpc) * 100) / 100
        : clicks > 0
          ? Math.round((spend / clicks) * 100) / 100
          : 0;
    const cpm =
      row?.cpm != null
        ? Math.round(Number(row.cpm) * 100) / 100
        : impressions > 0
          ? Math.round((spend / impressions) * 1000 * 100) / 100
          : 0;
    const frequency =
      row?.frequency != null ? Math.round(Number(row.frequency) * 100) / 100 : 0;

    return {
      spend,
      reach,
      impressions,
      clicks,
      linkClicks,
      engagement,
      conversions,
      ctr,
      cpc,
      cpm,
      frequency,
    };
  }

  private async fetchGoogleAdsInsights(
    oauth: StoredOAuthConfig,
    periodDays: number,
  ) {
    const env = getMarketingEnv();
    if (!env.google.developerToken || oauth.adAccountId === 'pending') {
      return null;
    }

    const customerId = oauth.adAccountId?.replace(/-/g, '');
    if (!customerId || customerId === 'unknown') return null;

    const query = `
      SELECT
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.conversions,
        metrics.ctr,
        metrics.average_cpc
      FROM campaign
      WHERE segments.date DURING LAST_${periodDays}_DAYS
    `;

    const res = await fetch(
      `https://googleads.googleapis.com/v18/customers/${customerId}/googleAds:searchStream`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${oauth.accessToken}`,
          'developer-token': env.google.developerToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      },
    );

    if (!res.ok) return null;

    const chunks = (await res.json()) as Array<{
      results?: Array<{
        metrics?: {
          impressions?: string;
          clicks?: string;
          costMicros?: string;
          conversions?: number;
          ctr?: number;
          averageCpc?: number;
        };
      }>;
    }>;

    let impressions = 0;
    let clicks = 0;
    let costMicros = 0;
    let conversions = 0;

    for (const chunk of chunks) {
      for (const r of chunk.results ?? []) {
        impressions += Number(r.metrics?.impressions ?? 0);
        clicks += Number(r.metrics?.clicks ?? 0);
        costMicros += Number(r.metrics?.costMicros ?? 0);
        conversions += Number(r.metrics?.conversions ?? 0);
      }
    }

    const spend = Math.round(costMicros / 1_000_000);
    const ctr = impressions > 0 ? Math.round((clicks / impressions) * 10000) / 100 : 0;
    const cpc = clicks > 0 ? Math.round((spend / clicks) * 100) / 100 : 0;
    const cpm = impressions > 0 ? Math.round((spend / impressions) * 1000 * 100) / 100 : 0;

    return {
      spend,
      reach: impressions,
      impressions,
      clicks,
      linkClicks: clicks,
      engagement: 0,
      conversions: Math.round(conversions),
      ctr,
      cpc,
      cpm,
      frequency: 0,
    };
  }
}
