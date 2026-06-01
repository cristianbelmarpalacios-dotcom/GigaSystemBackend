import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { UpdateNavFixedItemDto } from './dto/update-nav-fixed-item.dto';

const DEFAULT_ITEMS = [
  {
    slug: 'arma-tu-pc-3d',
    label: 'Armador de PC',
    href: '/arma-tu-pc-3d',
  },
] as const;

@Injectable()
export class NavFixedService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureDefaults() {
    for (const item of DEFAULT_ITEMS) {
      await this.prisma.navFixedItem.upsert({
        where: { slug: item.slug },
        create: item,
        update: {},
      });
    }
  }

  async listPublic() {
    await this.ensureDefaults();
    const rows = await this.prisma.navFixedItem.findMany({
      orderBy: { label: 'asc' },
    });
    return rows.map((row) => ({
      slug: row.slug,
      label: row.label,
      href: row.href,
      description: row.description,
      navImageUrl: row.navImageUrl,
    }));
  }

  async listAdmin() {
    await this.ensureDefaults();
    return this.prisma.navFixedItem.findMany({ orderBy: { label: 'asc' } });
  }

  async getBySlug(slug: string) {
    await this.ensureDefaults();
    const row = await this.prisma.navFixedItem.findUnique({ where: { slug } });
    if (!row) throw new NotFoundException('Entrada de menú no encontrada');
    return row;
  }

  async update(slug: string, dto: UpdateNavFixedItemDto) {
    await this.getBySlug(slug);
    return this.prisma.navFixedItem.update({
      where: { slug },
      data: {
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.navImageUrl !== undefined && { navImageUrl: dto.navImageUrl }),
        ...(dto.navImageStorageKey !== undefined && {
          navImageStorageKey: dto.navImageStorageKey,
        }),
      },
    });
  }
}
