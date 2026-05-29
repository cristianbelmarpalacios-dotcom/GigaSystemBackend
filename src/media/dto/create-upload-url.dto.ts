import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateUploadUrlDto {
  @IsString()
  fileName!: string;

  @IsString()
  mimeType!: string;

  @IsEnum(['image', 'model3d', 'import'])
  kind!: 'image' | 'model3d' | 'import';

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1024 * 1024 * 100)
  fileSize?: number;
}
