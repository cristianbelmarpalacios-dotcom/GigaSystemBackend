import { HomeTileLayout } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';

export class UpsertHomeTileDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsString()
  productId?: string;

  @IsOptional()
  @IsEnum(HomeTileLayout)
  layout?: HomeTileLayout;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  storageKey?: string;

  @IsOptional()
  @IsString()
  linkUrl?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  eyebrow?: string;

  @IsOptional()
  @IsString()
  priceLabel?: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
