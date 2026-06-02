import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateMarketingSettingsDto {
  @IsOptional()
  @IsBoolean()
  trackingEnabled?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  currency?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  gtmContainerId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  ga4MeasurementId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  metaPixelId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  googleAdsConversionId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  googleAdsConversionLabel?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  tiktokPixelId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;
}
