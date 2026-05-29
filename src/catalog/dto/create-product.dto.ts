import {
  Pc3dBuilderSlot,
  Pc3dCaseVariant,
  ProductStatus,
  ProductType,
} from '@prisma/client';
import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateProductDto {
  @IsEnum(ProductType)
  type!: ProductType;

  @IsString()
  name!: string;

  @IsString()
  slug!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  shortDesc?: string;

  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @IsOptional()
  @IsNumber()
  @Min(0)
  basePrice?: number;

  @IsOptional()
  @IsString()
  brandId?: string;

  @IsOptional()
  @IsArray()
  categoryIds?: string[];

  /** SKU de la variante inicial (recomendado). */
  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  /** Precio lista / normal (tachado en tienda si es mayor al precio de venta). */
  @IsOptional()
  @IsNumber()
  @Min(0)
  comparePrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  stock?: number;

  @IsOptional()
  @IsEnum(Pc3dBuilderSlot)
  pc3dBuilderSlot?: Pc3dBuilderSlot;

  @IsOptional()
  @IsEnum(Pc3dCaseVariant)
  pc3dCaseVariant?: Pc3dCaseVariant;

  @IsOptional()
  @IsString()
  pc3dCaseSigla?: string;
}
