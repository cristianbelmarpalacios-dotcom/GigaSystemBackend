import { MarketingPlatform } from '@prisma/client';

export type OAuthProviderKey = 'meta' | 'google_ads' | 'google_analytics';

export const PLATFORM_OAUTH: Partial<
  Record<MarketingPlatform, OAuthProviderKey>
> = {
  META_ADS: 'meta',
  GOOGLE_ADS: 'google_ads',
  GOOGLE_ANALYTICS: 'google_analytics',
};

export function getMarketingEnv() {
  const adminAppUrl = (
    process.env.ADMIN_APP_URL ?? 'http://localhost:3000'
  ).replace(/\/$/, '');
  const apiPublicUrl = (
    process.env.API_PUBLIC_URL ??
    process.env.MARKETING_OAUTH_REDIRECT_BASE ??
    `http://localhost:${process.env.PORT ?? 4000}`
  ).replace(/\/$/, '');

  return {
    adminAppUrl,
    oauthCallbackUrl: `${apiPublicUrl}/v1/admin/marketing/oauth/callback`,
    stateSecret: process.env.JWT_ACCESS_SECRET ?? 'marketing-oauth-state',
    meta: {
      appId: process.env.META_APP_ID?.trim() ?? '',
      appSecret: process.env.META_APP_SECRET?.trim() ?? '',
      configured: Boolean(
        process.env.META_APP_ID?.trim() &&
          process.env.META_APP_SECRET?.trim(),
      ),
    },
    google: {
      clientId: process.env.GOOGLE_OAUTH_CLIENT_ID?.trim() ?? '',
      clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim() ?? '',
      developerToken: process.env.GOOGLE_ADS_DEVELOPER_TOKEN?.trim() ?? '',
      configured: Boolean(
        process.env.GOOGLE_OAUTH_CLIENT_ID?.trim() &&
          process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim(),
      ),
    },
  };
}
