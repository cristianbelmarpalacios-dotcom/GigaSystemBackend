import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { HomeSectionType, HomeTileLayout } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { CatalogService } from '../catalog/catalog.service';
import { MediaService } from '../media/media.service';
import { UpsertHomeSectionDto } from './dto/upsert-home-section.dto';
import { CreateHomeSlideDto } from './dto/create-home-slide.dto';
import { UpsertHomePromoDto } from './dto/upsert-home-promo.dto';
import { UpsertHomeTileDto } from './dto/upsert-home-tile.dto';

const sectionInclude = {
  slides: { orderBy: { sortOrder: 'asc' as const } },
  promo: true,
  tiles: { orderBy: { sortOrder: 'asc' as const } },
};

@Injectable()
export class HomepageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: CatalogService,
    private readonly media: MediaService,
  ) {}

  async ensureSections() {
    const types: HomeSectionType[] = [
      'WELCOME_BLOCK',
      'STRIP_BANNER',
      'DEALS_CAROUSEL',
      'BANNER_GRID',
      'HERO_BANNER',
    ];
    const titles: Partial<Record<HomeSectionType, string | null>> = {
      HERO_BANNER: null,
      STRIP_BANNER: null,
      WELCOME_BLOCK: null,
      DEALS_CAROUSEL: 'Ofertas imperdibles',
      BANNER_GRID: 'Nuevos productos',
    };
    for (let i = 0; i < types.length; i++) {
      await this.prisma.homeSection.upsert({
        where: { type: types[i] },
        update: { sortOrder: i },
        create: {
          type: types[i],
          sortOrder: i,
          title: titles[types[i]] ?? null,
        },
      });
    }
    await this.prisma.homeSection.updateMany({
      where: { type: 'BANNER_GRID', title: 'Descubre nuevas categorías' },
      data: { title: 'Nuevos productos' },
    });
  }

  async getPublicHomepage() {
    await this.ensureSections();
    const sections = await this.prisma.homeSection.findMany({
      where: { isActive: true },
      include: {
        slides: sectionInclude.slides,
        promo: true,
        tiles: {
          orderBy: { sortOrder: 'asc' },
          include: {
            product: {
              include: {
                images: { orderBy: { sortOrder: 'asc' } },
                variants: {
                  where: { isActive: true },
                  orderBy: { price: 'asc' },
                  take: 1,
                },
              },
            },
          },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });
    const deals = await this.catalog.listDealProducts(10);
    return {
      sections: sections.map((section) => ({
        ...section,
        tiles: section.tiles.map((tile) => this.resolveTileForPublic(tile)),
      })),
      deals,
    };
  }

  async listAdmin() {
    await this.ensureSections();
    return this.prisma.homeSection.findMany({
      include: sectionInclude,
      orderBy: { sortOrder: 'asc' },
    });
  }

  async updateSection(type: HomeSectionType, dto: UpsertHomeSectionDto) {
    await this.ensureSections();
    return this.prisma.homeSection.update({
      where: { type },
      data: {
        title: dto.title,
        subtitle: dto.subtitle,
        isActive: dto.isActive,
        sortOrder: dto.sortOrder,
        ...(dto.backgroundImageUrl !== undefined && {
          backgroundImageUrl: dto.backgroundImageUrl,
        }),
        ...(dto.backgroundStorageKey !== undefined && {
          backgroundStorageKey: dto.backgroundStorageKey,
        }),
        ...(dto.backgroundOverlayOpacity !== undefined && {
          backgroundOverlayOpacity: dto.backgroundOverlayOpacity,
        }),
        ...(dto.backgroundBlurPx !== undefined && {
          backgroundBlurPx: dto.backgroundBlurPx,
        }),
      },
      include: sectionInclude,
    });
  }

  async addSlide(type: HomeSectionType, dto: CreateHomeSlideDto) {
    const section = await this.getSectionByType(type);
    const count = await this.prisma.homeSlide.count({
      where: { sectionId: section.id },
    });
    return this.prisma.homeSlide.create({
      data: {
        sectionId: section.id,
        imageUrl: dto.imageUrl,
        storageKey: dto.storageKey,
        linkUrl: dto.linkUrl,
        altText: dto.altText,
        sortOrder: dto.sortOrder ?? count,
      },
    });
  }

  async updateSlide(id: string, dto: Partial<CreateHomeSlideDto>) {
    return this.prisma.homeSlide.update({
      where: { id },
      data: dto,
    });
  }

  async deleteSlide(id: string) {
    await this.prisma.homeSlide.delete({ where: { id } });
    return { ok: true };
  }

  async upsertPromo(type: HomeSectionType, dto: UpsertHomePromoDto) {
    const section = await this.getSectionByType(type);
    return this.prisma.homePromo.upsert({
      where: { sectionId: section.id },
      update: { ...dto },
      create: { sectionId: section.id, ...dto },
    });
  }

  async upsertTile(type: HomeSectionType, dto: UpsertHomeTileDto) {
    const section = await this.getSectionByType(type);
    const data = await this.buildTileData(dto);
    if (dto.id) {
      return this.prisma.homeTile.update({
        where: { id: dto.id },
        data,
      });
    }
    const count = await this.prisma.homeTile.count({
      where: { sectionId: section.id },
    });
    return this.prisma.homeTile.create({
      data: {
        sectionId: section.id,
        ...data,
        sortOrder: data.sortOrder ?? count,
      },
    });
  }

  async deleteTile(id: string) {
    await this.prisma.homeTile.delete({ where: { id } });
    return { ok: true };
  }

  uploadImage(file: Express.Multer.File) {
    return this.media.uploadHomepageAsset(file);
  }

  private async getSectionByType(type: HomeSectionType) {
    await this.ensureSections();
    const section = await this.prisma.homeSection.findUnique({
      where: { type },
    });
    if (!section) throw new NotFoundException('Sección no encontrada');
    return section;
  }

  private async buildTileData(dto: UpsertHomeTileDto) {
    const layout = dto.layout ?? HomeTileLayout.VERTICAL;

    if (dto.productId) {
      const product = await this.prisma.product.findUnique({
        where: { id: dto.productId },
        include: {
          images: { orderBy: { sortOrder: 'asc' } },
          variants: {
            where: { isActive: true },
            orderBy: { price: 'asc' },
            take: 1,
          },
        },
      });
      if (!product) throw new NotFoundException('Producto no encontrado');
      const mainImage =
        product.images.find((i) => i.role === 'MAIN') ?? product.images[0];
      if (!mainImage) {
        throw new BadRequestException('El producto no tiene imagen');
      }
      const variant = product.variants[0];
      const priceLabel =
        dto.priceLabel?.trim() ||
        this.discountBadge(
          variant ? Number(variant.price) : null,
          variant?.comparePrice ? Number(variant.comparePrice) : null,
        ) ||
        null;

      return {
        layout,
        productId: dto.productId,
        imageUrl: mainImage.url,
        storageKey: mainImage.storageKey,
        linkUrl: `/producto/${product.slug}`,
        title: product.name,
        eyebrow: dto.eyebrow?.trim() || null,
        priceLabel,
        sortOrder: dto.sortOrder,
      };
    }

    if (!dto.imageUrl || !dto.title || !dto.linkUrl) {
      throw new BadRequestException(
        'Selecciona un producto o completa imagen, título y URL',
      );
    }

    return {
      layout,
      productId: null,
      imageUrl: dto.imageUrl,
      storageKey: dto.storageKey ?? '',
      linkUrl: dto.linkUrl,
      title: dto.title,
      eyebrow: dto.eyebrow?.trim() || null,
      priceLabel: dto.priceLabel?.trim() || null,
      sortOrder: dto.sortOrder,
    };
  }

  private resolveTileForPublic(
    tile: {
      id: string;
      layout: HomeTileLayout;
      productId: string | null;
      imageUrl: string;
      storageKey: string;
      linkUrl: string;
      title: string;
      eyebrow: string | null;
      priceLabel: string | null;
      sortOrder: number;
      product?: {
        name: string;
        slug: string;
        images: Array<{ role: string; url: string; storageKey: string }>;
        variants: Array<{
          price: { toString(): string };
          comparePrice: { toString(): string } | null;
        }>;
      } | null;
    },
  ) {
    if (!tile.product) {
      return {
        id: tile.id,
        layout: tile.layout,
        productId: tile.productId,
        imageUrl: tile.imageUrl,
        linkUrl: tile.linkUrl,
        title: tile.title,
        eyebrow: tile.eyebrow,
        priceLabel: tile.priceLabel,
        sortOrder: tile.sortOrder,
      };
    }

    const product = tile.product;
    const mainImage =
      product.images.find((i) => i.role === 'MAIN') ?? product.images[0];
    const variant = product.variants[0];
    const priceLabel =
      tile.priceLabel ||
      this.discountBadge(
        variant ? Number(variant.price) : null,
        variant?.comparePrice ? Number(variant.comparePrice) : null,
      );

    return {
      id: tile.id,
      layout: tile.layout,
      productId: tile.productId,
      imageUrl: mainImage?.url ?? tile.imageUrl,
      linkUrl: `/producto/${product.slug}`,
      title: product.name,
      eyebrow: tile.eyebrow,
      priceLabel,
      sortOrder: tile.sortOrder,
    };
  }

  private discountBadge(
    price: number | null | undefined,
    comparePrice: number | null | undefined,
  ) {
    if (price == null || comparePrice == null || comparePrice <= price) {
      return null;
    }
    const pct = Math.round(((comparePrice - price) / comparePrice) * 100);
    return pct > 0 ? `hasta ${pct}% dcto.` : null;
  }
}
