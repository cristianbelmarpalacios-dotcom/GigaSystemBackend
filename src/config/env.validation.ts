import { Transform, Type } from 'class-transformer';
import {
  IsBooleanString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  ValidateIf,
} from 'class-validator';

function trimEnvString({ value }: { value: unknown }): string {
  return typeof value === 'string' ? value.trim() : '';
}

class EnvVars {
  @IsEnum(['development', 'test', 'production'])
  NODE_ENV: 'development' | 'test' | 'production' = 'development';

  @Type(() => Number)
  @IsInt()
  PORT = 4000;

  @IsString()
  @IsNotEmpty()
  DATABASE_URL!: string;

  @IsString()
  @IsNotEmpty()
  JWT_ACCESS_SECRET!: string;

  @IsString()
  @IsNotEmpty()
  JWT_REFRESH_SECRET!: string;

  @IsString()
  @IsNotEmpty()
  JWT_ACCESS_EXPIRES_IN!: string;

  @IsString()
  @IsNotEmpty()
  JWT_REFRESH_EXPIRES_IN!: string;

  @IsEnum(['supabase', 's3'])
  STORAGE_PROVIDER: 'supabase' | 's3' = 'supabase';

  @ValidateIf((o: EnvVars) => o.STORAGE_PROVIDER === 'supabase')
  @IsString()
  @IsNotEmpty()
  SUPABASE_URL!: string;

  @ValidateIf((o: EnvVars) => o.STORAGE_PROVIDER === 'supabase')
  @Transform(trimEnvString)
  @IsString()
  @IsNotEmpty({
    message:
      'Falta SUPABASE_SERVICE_ROLE_KEY: Supabase → Settings → API → service_role (eyJ…) o Secret key (sb_secret_…)',
  })
  @Matches(/^(eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.|sb_secret_[a-zA-Z0-9_-]+)/, {
    message:
      'SUPABASE_SERVICE_ROLE_KEY inválida: usa service_role o Secret key, no anon/public',
  })
  SUPABASE_SERVICE_ROLE_KEY!: string;

  @ValidateIf((o: EnvVars) => o.STORAGE_PROVIDER === 'supabase')
  @IsString()
  @IsNotEmpty()
  SUPABASE_STORAGE_BUCKET!: string;

  @ValidateIf((o: EnvVars) => o.STORAGE_PROVIDER === 's3')
  @IsString()
  @IsNotEmpty()
  S3_ENDPOINT!: string;

  @ValidateIf((o: EnvVars) => o.STORAGE_PROVIDER === 's3')
  @IsString()
  @IsNotEmpty()
  S3_REGION!: string;

  @ValidateIf((o: EnvVars) => o.STORAGE_PROVIDER === 's3')
  @IsString()
  @IsNotEmpty()
  S3_ACCESS_KEY!: string;

  @ValidateIf((o: EnvVars) => o.STORAGE_PROVIDER === 's3')
  @IsString()
  @IsNotEmpty()
  S3_SECRET_KEY!: string;

  @ValidateIf((o: EnvVars) => o.STORAGE_PROVIDER === 's3')
  @IsString()
  @IsNotEmpty()
  S3_BUCKET!: string;

  @ValidateIf((o: EnvVars) => o.STORAGE_PROVIDER === 's3')
  @IsBooleanString()
  S3_FORCE_PATH_STYLE = 'true';

  @IsString()
  @IsNotEmpty()
  REDIS_URL!: string;

  @IsEnum(['stripe', 'mock'])
  PAYMENT_PROVIDER: 'stripe' | 'mock' = 'mock';

  @IsOptional()
  @IsString()
  STRIPE_SECRET_KEY?: string;

  @IsOptional()
  @IsString()
  STRIPE_WEBHOOK_SECRET?: string;
}

export default EnvVars;
