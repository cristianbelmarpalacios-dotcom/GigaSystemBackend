import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpsertHomeSectionDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  subtitle?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsString()
  backgroundImageUrl?: string | null;

  @IsOptional()
  @IsString()
  backgroundStorageKey?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  backgroundOverlayOpacity?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(24)
  backgroundBlurPx?: number;

  @IsOptional()
  @IsBoolean()
  showWelcomeText?: boolean;
}
