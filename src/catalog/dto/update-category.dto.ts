import { CategoryStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, ValidateIf } from 'class-validator';

export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @ValidateIf((_o, value) => value !== null)
  @IsString()
  parentId?: string | null;

  @IsOptional()
  @IsEnum(CategoryStatus)
  status?: CategoryStatus;
}
