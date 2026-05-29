import { IsOptional, IsString } from 'class-validator';

export class CompleteUploadDto {
  @IsString()
  productId!: string;

  @IsString()
  storageKey!: string;

  @IsString()
  mimeType!: string;

  @IsOptional()
  @IsString()
  role?: 'MAIN' | 'GALLERY' | 'THUMB' | 'DETAIL';
}
