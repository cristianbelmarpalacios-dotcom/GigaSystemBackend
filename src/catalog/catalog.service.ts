import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Prisma, ProductStatus, CategoryStatus } from '@prisma/client';

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async createProduct(input: CreateProductDto) {
    const sku = input.sku ?? `${input.slug}-001`.toUpperCase();
    const price = input.price ?? input.basePrice ?? 0;
    try {
      return await this.prisma.product.create({
        data: {
          type: input.type,
          name: input.name,
          slug: input.slug,
          description: input.description,
          shortDesc: input.shortDesc,
          basePrice: input.basePrice ?? input.comparePrice ?? price,
          brandId: input.brandId,
          status: input.status ?? ProductStatus.ARCHIVED,
          pc3dBuilderSlot: input.pc3dBuilderSlot,
          pc3dCaseVariant: input.pc3dCaseVariant,
          pc3dCaseSigla: input.pc3dCaseSigla,
          categories: input.categoryIds?.length
            ? {
                createMany: {
                  data: input.categoryIds.map((categoryId) => ({ categoryId })),
                },
              }
            : undefined,
          variants: {
            create: {
              sku,
              name: input.name,
              price,
              comparePrice: input.comparePrice,
              stock: input.stock ?? 0,
            },
          },
        },
        include: {
          variants: true,
          images: true,
          categories: { include: { category: true } },
        },
      });
    } catch (error) {
      this.rethrowUniqueViolation(error, {
        slug: `Ya existe un producto con el slug «${input.slug}». Cambia el slug (URL) o edita el producto existente.`,
        sku: `Ya existe una variante con el SKU «${sku}». Usa otro código.`,
      });
    }
  }

  private rethrowUniqueViolation(
    error: unknown,
    messages: { slug?: string; sku?: string },
  ): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      const target = error.meta?.target;
      const fields = Array.isArray(target)
        ? target.map(String)
        : typeof target === 'string'
          ? [target]
          : [];
      if (fields.some((f) => f.includes('slug')) && messages.slug) {
        throw new ConflictException(messages.slug);
      }
      if (fields.some((f) => f.includes('sku')) && messages.sku) {
        throw new ConflictException(messages.sku);
      }
      throw new ConflictException(
        'Ya existe un registro con el mismo identificador único.',
      );
    }
    throw error;
  }

  createCategory(input: CreateCategoryDto) {
    return this.prisma.category.create({
      data: {
        name: input.name,
        slug: input.slug,
        description: input.description,
        parentId: input.parentId,
        status: CategoryStatus.ARCHIVED,
      },
      include: { parent: true, _count: { select: { products: true } } },
    });
  }

  listCategories(status?: CategoryStatus) {
    return this.prisma.category.findMany({
      where: status ? { status } : undefined,
      include: { parent: true, _count: { select: { products: true } } },
      orderBy: [{ parentId: 'asc' }, { name: 'asc' }],
    });
  }

  async getAdminCategory(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: { parent: true, _count: { select: { products: true } } },
    });
    if (!category) throw new NotFoundException('Categoría no encontrada');
    return category;
  }

  /** Baja lógica: deja de mostrarse en menú y catálogo público. */
  async archiveCategory(id: string) {
    const category = await this.getAdminCategory(id);
    if (category.status === CategoryStatus.ARCHIVED) {
      return {
        ok: true,
        status: CategoryStatus.ARCHIVED,
        alreadyArchived: true,
      };
    }
    await this.prisma.category.update({
      where: { id },
      data: { status: CategoryStatus.ARCHIVED },
    });
    return { ok: true, status: CategoryStatus.ARCHIVED };
  }

  async updateCategory(id: string, input: UpdateCategoryDto) {
    await this.getAdminCategory(id);

    if (input.parentId !== undefined) {
      if (input.parentId === id) {
        throw new ConflictException(
          'Una categoría no puede ser su propio padre.',
        );
      }
      if (input.parentId) {
        const parent = await this.prisma.category.findUnique({
          where: { id: input.parentId },
        });
        if (!parent)
          throw new NotFoundException('Categoría padre no encontrada');
        const descendants = await this.getCategoryDescendantIds(id);
        if (descendants.has(input.parentId)) {
          throw new ConflictException(
            'No puedes asignar un descendiente como categoría padre.',
          );
        }
      }
    }

    try {
      return await this.prisma.category.update({
        where: { id },
        data: {
          name: input.name,
          slug: input.slug,
          description: input.description,
          status: input.status,
          ...(input.parentId !== undefined ? { parentId: input.parentId } : {}),
        },
        include: { parent: true, _count: { select: { products: true } } },
      });
    } catch (error) {
      this.rethrowUniqueViolation(error, {
        slug: input.slug
          ? `Ya existe una categoría con el slug «${input.slug}».`
          : undefined,
      });
    }
  }

  private async getCategoryDescendantIds(rootId: string): Promise<Set<string>> {
    const rows = await this.prisma.category.findMany({
      select: { id: true, parentId: true },
    });
    const ids = new Set<string>();
    const walk = (parentId: string) => {
      for (const row of rows) {
        if (row.parentId === parentId && !ids.has(row.id)) {
          ids.add(row.id);
          walk(row.id);
        }
      }
    };
    walk(rootId);
    return ids;
  }

  async getAdminProduct(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        variants: true,
        images: true,
        categories: { include: { category: true } },
        brand: true,
      },
    });
    if (!product) throw new NotFoundException('Producto no encontrado');
    return product;
  }

  /** Baja lógica: el producto deja de estar vigente en tienda (no se borra de la BD). */
  async archiveProduct(id: string) {
    const product = await this.getAdminProduct(id);
    if (product.status === ProductStatus.ARCHIVED) {
      return {
        ok: true,
        status: ProductStatus.ARCHIVED,
        alreadyArchived: true,
      };
    }
    await this.prisma.product.update({
      where: { id },
      data: { status: ProductStatus.ARCHIVED },
    });
    return { ok: true, status: ProductStatus.ARCHIVED };
  }

  async updateProduct(id: string, input: UpdateProductDto) {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Producto no encontrado');

    if (input.categoryIds) {
      await this.prisma.productCategory.deleteMany({
        where: { productId: id },
      });
    }

    await this.prisma.product.update({
      where: { id },
      data: {
        type: input.type,
        name: input.name,
        slug: input.slug,
        description: input.description,
        shortDesc: input.shortDesc,
        status: input.status,
        basePrice: input.basePrice,
        brandId: input.brandId,
        pc3dBuilderSlot: input.pc3dBuilderSlot,
        pc3dCaseVariant: input.pc3dCaseVariant,
        pc3dCaseSigla: input.pc3dCaseSigla,
        categories: input.categoryIds?.length
          ? {
              createMany: {
                data: input.categoryIds.map((categoryId) => ({ categoryId })),
              },
            }
          : undefined,
      },
    });

    const variant = await this.prisma.productVariant.findFirst({
      where: { productId: id },
      orderBy: { createdAt: 'asc' },
    });
    if (
      variant &&
      (input.price !== undefined ||
        input.comparePrice !== undefined ||
        input.stock !== undefined ||
        input.sku !== undefined)
    ) {
      await this.prisma.productVariant.update({
        where: { id: variant.id },
        data: {
          price: input.price,
          comparePrice: input.comparePrice,
          stock: input.stock,
          sku: input.sku,
        },
      });
    }

    return this.getAdminProduct(id);
  }

  private readonly publishedProductInclude = {
    brand: { select: { id: true, name: true, slug: true } },
    images: { orderBy: { sortOrder: 'asc' as const } },
    variants: { where: { isActive: true }, orderBy: { price: 'asc' as const } },
    categories: { include: { category: true } },
  };

  private async categoryIdsForSlug(slug: string): Promise<string[]> {
    const category = await this.prisma.category.findUnique({ where: { slug } });
    if (!category) return [];

    const all = await this.prisma.category.findMany({
      select: { id: true, parentId: true },
    });
    const byParent = new Map<string | null, string[]>();
    for (const row of all) {
      const key = row.parentId;
      const list = byParent.get(key) ?? [];
      list.push(row.id);
      byParent.set(key, list);
    }

    const ids: string[] = [];
    const walk = (id: string) => {
      ids.push(id);
      for (const childId of byParent.get(id) ?? []) walk(childId);
    };
    walk(category.id);
    return ids;
  }

  async listPublishedProducts(input?: {
    search?: string;
    categorySlug?: string;
  }) {
    const search = input?.search?.trim();
    const categoryIds = input?.categorySlug
      ? await this.categoryIdsForSlug(input.categorySlug)
      : null;

    return this.prisma.product.findMany({
      where: {
        status: ProductStatus.PUBLISHED,
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { slug: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
        ...(categoryIds !== null
          ? categoryIds.length > 0
            ? {
                categories: {
                  some: { categoryId: { in: categoryIds } },
                },
              }
            : { id: { in: [] } }
          : {}),
      },
      include: this.publishedProductInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async listDealProducts(limit = 10) {
    const products = await this.prisma.product.findMany({
      where: { status: ProductStatus.PUBLISHED },
      include: this.publishedProductInclude,
    });

    type Scored = { product: (typeof products)[0]; discount: number };
    const scored: Scored[] = [];

    for (const product of products) {
      const variant = product.variants[0];
      if (!variant) continue;
      const price = Number(variant.price);
      const compare = variant.comparePrice
        ? Number(variant.comparePrice)
        : null;
      if (compare === null || compare <= price) continue;
      const discount = Math.round(((compare - price) / compare) * 100);
      if (discount > 0) scored.push({ product, discount });
    }

    scored.sort((a, b) => b.discount - a.discount);
    return scored.slice(0, limit).map((s) => s.product);
  }

  async listPublicCategoryTree() {
    const categories = await this.prisma.category.findMany({
      where: { parentId: null, status: CategoryStatus.PUBLISHED },
      include: {
        children: {
          where: { status: CategoryStatus.PUBLISHED },
          orderBy: { name: 'asc' },
          include: {
            _count: { select: { products: true } },
          },
        },
        _count: { select: { products: true } },
      },
      orderBy: { name: 'asc' },
    });

    return categories.map((root) => ({
      id: root.id,
      name: root.name,
      slug: root.slug,
      description: root.description,
      productCount: root._count.products,
      children: root.children.map((child) => ({
        id: child.id,
        name: child.name,
        slug: child.slug,
        description: child.description,
        productCount: child._count.products,
      })),
    }));
  }

  async getPublicCategoryBySlug(slug: string) {
    const category = await this.prisma.category.findUnique({
      where: { slug },
      include: {
        parent: true,
        children: {
          where: { status: CategoryStatus.PUBLISHED },
          orderBy: { name: 'asc' },
        },
      },
    });
    if (!category) {
      throw new NotFoundException('Categoría no encontrada');
    }
    if (category.status !== CategoryStatus.PUBLISHED) {
      throw new NotFoundException('Categoría no encontrada');
    }

    const childSections = await Promise.all(
      category.children.map(async (child) => ({
        id: child.id,
        name: child.name,
        slug: child.slug,
        description: child.description,
        products: await this.prisma.product.findMany({
          where: {
            status: ProductStatus.PUBLISHED,
            categories: { some: { categoryId: child.id } },
          },
          include: this.publishedProductInclude,
          orderBy: { name: 'asc' },
        }),
      })),
    );

    const directProducts = await this.prisma.product.findMany({
      where: {
        status: ProductStatus.PUBLISHED,
        categories: { some: { categoryId: category.id } },
      },
      include: this.publishedProductInclude,
      orderBy: { name: 'asc' },
    });

    return {
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      parent: category.parent
        ? {
            name: category.parent.name,
            slug: category.parent.slug,
          }
        : null,
      children: category.children.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description,
      })),
      childSections,
      directProducts,
    };
  }

  async getPublicProductBySlug(slug: string) {
    const product = await this.prisma.product.findFirst({
      where: { slug, status: ProductStatus.PUBLISHED },
      include: this.publishedProductInclude,
    });

    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }
    return product;
  }

  listAdminProducts(status?: ProductStatus) {
    return this.prisma.product.findMany({
      where: status ? { status } : undefined,
      include: {
        brand: true,
        variants: true,
        images: true,
        categories: { include: { category: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  listBrands() {
    return this.prisma.brand.findMany({ orderBy: { name: 'asc' } });
  }

  async createBrand(name: string) {
    const slug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    return this.prisma.brand.upsert({
      where: { slug },
      update: { name },
      create: { name, slug },
    });
  }
}
