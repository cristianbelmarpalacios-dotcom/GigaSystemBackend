import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { ImageRole } from '@prisma/client';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import { CreateUploadUrlDto } from './dto/create-upload-url.dto';
import { CompleteUploadDto } from './dto/complete-upload.dto';

type StorageProvider = 'supabase' | 's3';

@Injectable()
export class MediaService {
  private readonly storageProvider: StorageProvider;
  private readonly bucket: string;
  private readonly supabase?: SupabaseClient;
  private readonly s3?: S3Client;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.storageProvider =
      (this.configService.get<string>('STORAGE_PROVIDER') as StorageProvider) ??
      'supabase';

    if (this.storageProvider === 'supabase') {
      this.bucket = this.configService.getOrThrow<string>(
        'SUPABASE_STORAGE_BUCKET',
      );
      const supabaseUrl = this.configService
        .getOrThrow<string>('SUPABASE_URL')
        .trim();
      const supabaseKey = this.configService
        .getOrThrow<string>('SUPABASE_SERVICE_ROLE_KEY')
        .trim();
      if (!supabaseKey) {
        throw new Error(
          'SUPABASE_SERVICE_ROLE_KEY vacía en .env. Supabase → Settings → API → service_role',
        );
      }
      this.supabase = createClient(supabaseUrl, supabaseKey);
    } else {
      this.bucket = this.configService.getOrThrow<string>('S3_BUCKET');
      this.s3 = new S3Client({
        endpoint: this.configService.getOrThrow<string>('S3_ENDPOINT'),
        region: this.configService.getOrThrow<string>('S3_REGION'),
        forcePathStyle:
          this.configService.get('S3_FORCE_PATH_STYLE') === 'true',
        credentials: {
          accessKeyId: this.configService.getOrThrow<string>('S3_ACCESS_KEY'),
          secretAccessKey:
            this.configService.getOrThrow<string>('S3_SECRET_KEY'),
        },
      });
    }
  }

  async createUploadUrl(input: CreateUploadUrlDto) {
    if (this.storageProvider === 'supabase') {
      throw new BadRequestException(
        'Con Supabase Storage usa POST /v1/admin/media/upload-image desde el admin.',
      );
    }

    if (!this.s3) {
      throw new BadRequestException('Almacén S3 no configurado');
    }

    if (!this.isAllowedMime(input.kind, input.mimeType)) {
      throw new BadRequestException('Tipo de archivo no permitido');
    }

    const ext = input.fileName.includes('.')
      ? input.fileName.split('.').pop()
      : 'bin';
    const storageKey = `${input.kind}/${new Date().getFullYear()}/${randomUUID()}.${ext}`;
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: storageKey,
      ContentType: input.mimeType,
    });
    const uploadUrl = await getSignedUrl(this.s3, command, {
      expiresIn: 60 * 5,
    });
    return { uploadUrl, storageKey, expiresInSeconds: 300 };
  }

  async uploadHomepageAsset(file: Express.Multer.File) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('No se recibió ningún archivo');
    }
    if (!/^image\//.test(file.mimetype)) {
      throw new BadRequestException('Solo se permiten archivos de imagen');
    }
    const ext = file.originalname.includes('.')
      ? file.originalname.split('.').pop()
      : 'jpg';
    const storageKey = `homepage/${new Date().getFullYear()}/${randomUUID()}.${ext}`;
    await this.putObject(storageKey, file.buffer, file.mimetype);
    return { storageKey, url: this.publicUrl(storageKey) };
  }

  async uploadImageDirect(
    productId: string,
    file: Express.Multer.File,
    role?: ImageRole,
  ) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('No se recibió ningún archivo');
    }
    if (!/^image\//.test(file.mimetype)) {
      throw new BadRequestException('Solo se permiten archivos de imagen');
    }

    const ext = file.originalname.includes('.')
      ? file.originalname.split('.').pop()
      : 'jpg';
    const storageKey = `image/${new Date().getFullYear()}/${randomUUID()}.${ext}`;

    await this.putObject(storageKey, file.buffer, file.mimetype);

    return this.completeImageUpload({
      productId,
      storageKey,
      mimeType: file.mimetype,
      role,
    });
  }

  private async putObject(
    storageKey: string,
    body: Buffer,
    contentType: string,
  ) {
    if (this.storageProvider === 'supabase') {
      if (!this.supabase) {
        throw new BadRequestException('Supabase Storage no configurado');
      }
      const { error } = await this.supabase.storage
        .from(this.bucket)
        .upload(storageKey, body, { contentType, upsert: false });
      if (error) {
        const hint = /jws|jwt|invalid.*key/i.test(error.message)
          ? 'Revisa SUPABASE_SERVICE_ROLE_KEY en .env: debe ser la clave «service_role» (empieza con eyJ…), no la anon ni el texto de ejemplo.'
          : `¿Existe el bucket «${this.bucket}» y está público?`;
        throw new BadRequestException(
          `Supabase Storage: ${error.message}. ${hint}`,
        );
      }
      return;
    }

    if (!this.s3) {
      throw new BadRequestException('Almacén S3 no configurado');
    }

    try {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: storageKey,
          Body: body,
          ContentType: contentType,
        }),
      );
    } catch (err) {
      const detail = err instanceof Error ? err.message : 'error de conexión';
      throw new BadRequestException(
        `No se pudo guardar en MinIO/S3 (${this.configService.get<string>('S3_ENDPOINT')}). ¿Docker/MinIO en el puerto 9000? Detalle: ${detail}`,
      );
    }
  }

  async completeImageUpload(input: CompleteUploadDto) {
    const url = this.publicUrl(input.storageKey);
    const role = input.role ?? (await this.defaultImageRole(input.productId));
    const sortOrder = await this.prisma.productImage.count({
      where: { productId: input.productId, role },
    });
    return this.prisma.productImage.create({
      data: {
        productId: input.productId,
        storageKey: input.storageKey,
        url,
        mimeType: input.mimeType,
        role,
        sortOrder,
      },
    });
  }

  async addExternalImageUrl(
    productId: string,
    url: string,
    role: ImageRole = ImageRole.DETAIL,
  ) {
    const trimmed = url.trim();
    if (!/^https?:\/\/.+/i.test(trimmed)) {
      throw new BadRequestException('La URL debe comenzar con http:// o https://');
    }

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });
    if (!product) {
      throw new BadRequestException('Producto no encontrado');
    }

    const sortOrder = await this.prisma.productImage.count({
      where: { productId, role },
    });

    return this.prisma.productImage.create({
      data: {
        productId,
        storageKey: `external:${randomUUID()}`,
        url: trimmed,
        mimeType: 'image/*',
        role,
        sortOrder,
      },
    });
  }

  private async defaultImageRole(productId: string): Promise<ImageRole> {
    const galleryCount = await this.prisma.productImage.count({
      where: {
        productId,
        role: { in: ['MAIN', 'GALLERY', 'THUMB'] },
      },
    });
    return galleryCount === 0 ? 'MAIN' : 'GALLERY';
  }

  publicUrl(storageKey: string) {
    if (this.storageProvider === 'supabase' && this.supabase) {
      const { data } = this.supabase.storage
        .from(this.bucket)
        .getPublicUrl(storageKey);
      return data.publicUrl;
    }

    const endpoint = this.configService.getOrThrow<string>('S3_ENDPOINT');
    return `${endpoint.replace(/\/$/, '')}/${this.bucket}/${storageKey}`;
  }

  private isAllowedMime(kind: CreateUploadUrlDto['kind'], mimeType: string) {
    if (kind === 'image') return /^image\//.test(mimeType);
    if (kind === 'model3d')
      return ['model/gltf-binary', 'application/octet-stream'].includes(
        mimeType,
      );
    return ['text/csv', 'application/vnd.ms-excel'].includes(mimeType);
  }
}
