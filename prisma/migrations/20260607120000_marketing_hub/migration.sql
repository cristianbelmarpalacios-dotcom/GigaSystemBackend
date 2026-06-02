-- AlterEnum
ALTER TYPE "AdminModule" ADD VALUE 'MARKETING';

-- CreateEnum
CREATE TYPE "MarketingPlatform" AS ENUM ('GOOGLE_ADS', 'META_ADS', 'GOOGLE_ANALYTICS', 'META_PIXEL', 'TIKTOK_ADS');

-- CreateEnum
CREATE TYPE "MarketingConnectionStatus" AS ENUM ('DISCONNECTED', 'PENDING', 'CONNECTED', 'ERROR');

-- CreateTable
CREATE TABLE "MarketingSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "trackingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "currency" TEXT NOT NULL DEFAULT 'CLP',
    "gtmContainerId" TEXT,
    "ga4MeasurementId" TEXT,
    "metaPixelId" TEXT,
    "googleAdsConversionId" TEXT,
    "googleAdsConversionLabel" TEXT,
    "tiktokPixelId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketingSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketingPlatformConnection" (
    "id" TEXT NOT NULL,
    "platform" "MarketingPlatform" NOT NULL,
    "status" "MarketingConnectionStatus" NOT NULL DEFAULT 'DISCONNECTED',
    "accountName" TEXT,
    "accountExternalId" TEXT,
    "lastSyncAt" TIMESTAMP(3),
    "lastError" TEXT,
    "config" JSONB,
    "connectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketingPlatformConnection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MarketingPlatformConnection_platform_key" ON "MarketingPlatformConnection"("platform");
