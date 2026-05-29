import { IsInt, IsOptional, IsString } from 'class-validator';

export class CreateHomeSlideDto {
  @IsString()
  imageUrl!: string;

  @IsString()
  storageKey!: string;

  @IsString()
  linkUrl!: string;

  @IsOptional()
  @IsString()
  altText?: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
