import { IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';

export class UpdateNavFixedItemDto {
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(2048)
  navImageUrl?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(512)
  navImageStorageKey?: string | null;
}
