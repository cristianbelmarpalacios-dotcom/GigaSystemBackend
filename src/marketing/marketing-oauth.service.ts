import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  MarketingConnectionStatus,
  MarketingPlatform,
} from '@prisma/client';
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { PrismaService } from '../database/prisma.service';
import {
  getMarketingEnv,
  OAuthProviderKey,
  PLATFORM_OAUTH,
} from './marketing-oauth.config';

type OAuthStatePayload = {
  platform: MarketingPlatform;
  userId: string;
  exp: number;
  nonce: string;
};

export type StoredOAuthConfig = {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  provider: OAuthProviderKey;
  adAccountId?: string;
  adAccountName?: string;
  cachedMetrics?: {
    periodDays: number;
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
};

@Injectable()
export class MarketingOAuthService {
  constructor(private readonly prisma: PrismaService) {}

  getProviderStatus() {
    const env = getMarketingEnv();
    return {
      meta: {
        configured: env.meta.configured,
        redirectUri: env.oauthCallbackUrl,
      },
      google: {
        configured: env.google.configured,
        adsApiReady: Boolean(env.google.developerToken),
        redirectUri: env.oauthCallbackUrl,
      },
    };
  }

  createAuthorizationUrl(platform: MarketingPlatform, userId: string) {
    const provider = PLATFORM_OAUTH[platform];
    if (!provider) {
      throw new BadRequestException(
        'Esta plataforma no admite conexión OAuth todavía',
      );
    }

    const env = getMarketingEnv();
    const state = this.signState({
      platform,
      userId,
      exp: Date.now() + 10 * 60 * 1000,
      nonce: randomBytes(12).toString('hex'),
    });

    if (provider === 'meta') {
      if (!env.meta.configured) {
        throw new ServiceUnavailableException(
          'Configura META_APP_ID y META_APP_SECRET en el backend',
        );
      }
      const scope = [
        'ads_read',
        'read_insights',
        'business_management',
      ].join(',');
      const params = new URLSearchParams({
        client_id: env.meta.appId,
        redirect_uri: env.oauthCallbackUrl,
        state,
        scope,
        response_type: 'code',
      });
      return `https://www.facebook.com/v21.0/dialog/oauth?${params}`;
    }

    if (!env.google.configured) {
      throw new ServiceUnavailableException(
        'Configura GOOGLE_OAUTH_CLIENT_ID y GOOGLE_OAUTH_CLIENT_SECRET en el backend',
      );
    }

    const scopes =
      provider === 'google_analytics'
        ? ['https://www.googleapis.com/auth/analytics.readonly']
        : ['https://www.googleapis.com/auth/adwords'];

    const params = new URLSearchParams({
      client_id: env.google.clientId,
      redirect_uri: env.oauthCallbackUrl,
      response_type: 'code',
      scope: scopes.join(' '),
      access_type: 'offline',
      prompt: 'consent',
      state,
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  }

  async handleOAuthCallback(code: string, state: string) {
    const payload = this.verifyState(state);
    const provider = PLATFORM_OAUTH[payload.platform];
    if (!provider) {
      throw new BadRequestException('Plataforma OAuth no válida');
    }

    const tokens =
      provider === 'meta'
        ? await this.exchangeMetaCode(code)
        : await this.exchangeGoogleCode(code);

    let accountName: string | null = null;
    let accountExternalId: string | null = null;
    const config: StoredOAuthConfig = {
      accessToken: tokens.accessToken,
      expiresAt: tokens.expiresAt,
      provider,
      ...('refreshToken' in tokens && typeof tokens.refreshToken === 'string'
        ? { refreshToken: tokens.refreshToken }
        : {}),
    };

    if (provider === 'meta') {
      const account = await this.fetchMetaAdAccount(tokens.accessToken);
      accountName = account.name;
      accountExternalId = account.id;
      config.adAccountId = account.id;
      config.adAccountName = account.name;
    } else if (provider === 'google_ads') {
      const customer = await this.fetchGoogleAdsCustomer(tokens.accessToken);
      accountName = customer.name;
      accountExternalId = customer.id;
      config.adAccountId = customer.id;
      config.adAccountName = customer.name;
    } else {
      accountName = 'Google Analytics';
      accountExternalId = 'ga4';
    }

    await this.prisma.marketingPlatformConnection.update({
      where: { platform: payload.platform },
      data: {
        status: MarketingConnectionStatus.CONNECTED,
        accountName,
        accountExternalId,
        connectedAt: new Date(),
        lastSyncAt: null,
        lastError: null,
        config: config as object,
      },
    });

    if (payload.platform === MarketingPlatform.META_ADS) {
      const settings = await this.prisma.marketingSettings.findUnique({
        where: { id: 'default' },
      });
      await this.prisma.marketingPlatformConnection.update({
        where: { platform: MarketingPlatform.META_PIXEL },
        data: {
          status: settings?.metaPixelId
            ? MarketingConnectionStatus.CONNECTED
            : MarketingConnectionStatus.DISCONNECTED,
          accountName: settings?.metaPixelId
            ? `Pixel ${settings.metaPixelId}`
            : null,
          connectedAt: settings?.metaPixelId ? new Date() : null,
        },
      });
    }

    return {
      platform: payload.platform,
      accountName,
    };
  }

  private async exchangeMetaCode(code: string) {
    const env = getMarketingEnv();
    const shortParams = new URLSearchParams({
      client_id: env.meta.appId,
      client_secret: env.meta.appSecret,
      redirect_uri: env.oauthCallbackUrl,
      code,
    });
    const shortRes = await fetch(
      `https://graph.facebook.com/v21.0/oauth/access_token?${shortParams}`,
    );
    const shortJson = (await shortRes.json()) as {
      access_token?: string;
      error?: { message: string };
    };
    if (!shortRes.ok || !shortJson.access_token) {
      throw new BadRequestException(
        shortJson.error?.message ?? 'No se pudo obtener token de Meta',
      );
    }

    const longParams = new URLSearchParams({
      grant_type: 'fb_exchange_token',
      client_id: env.meta.appId,
      client_secret: env.meta.appSecret,
      fb_exchange_token: shortJson.access_token,
    });
    const longRes = await fetch(
      `https://graph.facebook.com/v21.0/oauth/access_token?${longParams}`,
    );
    const longJson = (await longRes.json()) as {
      access_token?: string;
      expires_in?: number;
      error?: { message: string };
    };
    if (!longRes.ok || !longJson.access_token) {
      return {
        accessToken: shortJson.access_token,
        expiresAt: undefined,
      };
    }

    return {
      accessToken: longJson.access_token,
      expiresAt: longJson.expires_in
        ? Date.now() + longJson.expires_in * 1000
        : undefined,
    };
  }

  private async exchangeGoogleCode(code: string) {
    const env = getMarketingEnv();
    const body = new URLSearchParams({
      code,
      client_id: env.google.clientId,
      client_secret: env.google.clientSecret,
      redirect_uri: env.oauthCallbackUrl,
      grant_type: 'authorization_code',
    });
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    const json = (await res.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      error?: string;
      error_description?: string;
    };
    if (!res.ok || !json.access_token) {
      throw new BadRequestException(
        json.error_description ?? json.error ?? 'Token de Google inválido',
      );
    }
    return {
      accessToken: json.access_token,
      refreshToken: json.refresh_token,
      expiresAt: json.expires_in
        ? Date.now() + json.expires_in * 1000
        : undefined,
    };
  }

  private async fetchMetaAdAccount(accessToken: string) {
    const params = new URLSearchParams({
      fields: 'name,account_id,account_status',
      access_token: accessToken,
    });
    const res = await fetch(
      `https://graph.facebook.com/v21.0/me/adaccounts?${params}`,
    );
    const json = (await res.json()) as {
      data?: Array<{
        name: string;
        account_id: string;
        account_status?: number;
      }>;
      error?: { message: string };
    };
    if (!res.ok || !json.data?.length) {
      throw new BadRequestException(
        json.error?.message ??
          'No se encontraron cuentas publicitarias en Meta',
      );
    }
    const active =
      json.data.find((a) => a.account_status === 1) ?? json.data[0]!;
    return {
      id: active.account_id,
      name: active.name,
    };
  }

  private async fetchGoogleAdsCustomer(accessToken: string) {
    const env = getMarketingEnv();
    if (!env.google.developerToken) {
      return { id: 'pending', name: 'Google Ads (añade GOOGLE_ADS_DEVELOPER_TOKEN)' };
    }
    const res = await fetch(
      'https://googleads.googleapis.com/v18/customers:listAccessibleCustomers',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'developer-token': env.google.developerToken,
        },
      },
    );
    const json = (await res.json()) as {
      resourceNames?: string[];
      error?: { message: string };
    };
    if (!res.ok || !json.resourceNames?.length) {
      return {
        id: 'unknown',
        name: json.error?.message ?? 'Cuenta Google Ads',
      };
    }
    const resource = json.resourceNames[0]!;
    const id = resource.replace('customers/', '');
    return { id, name: `Cuenta Google Ads ${id}` };
  }

  private signState(payload: OAuthStatePayload) {
    const env = getMarketingEnv();
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const sig = createHmac('sha256', env.stateSecret)
      .update(body)
      .digest('base64url');
    return `${body}.${sig}`;
  }

  private verifyState(state: string): OAuthStatePayload {
    const env = getMarketingEnv();
    const [body, sig] = state.split('.');
    if (!body || !sig) throw new BadRequestException('Estado OAuth inválido');
    const expected = createHmac('sha256', env.stateSecret)
      .update(body)
      .digest('base64url');
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new BadRequestException('Estado OAuth corrupto');
    }
    const payload = JSON.parse(
      Buffer.from(body, 'base64url').toString('utf8'),
    ) as OAuthStatePayload;
    if (payload.exp < Date.now()) {
      throw new BadRequestException('La sesión OAuth expiró, intenta de nuevo');
    }
    return payload;
  }
}
