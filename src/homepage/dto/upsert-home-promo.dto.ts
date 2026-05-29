import { IsOptional, IsString } from 'class-validator';

export class UpsertHomePromoDto {
  @IsString()
  imageUrl!: string;

  @IsString()
  storageKey!: string;

  @IsString()
  linkUrl!: string;

  @IsOptional()
  @IsString()
  heading?: string;

  @IsOptional()
  @IsString()
  subheading?: string;

  @IsOptional()
  @IsString()
  ctaLabel?: string;
}
