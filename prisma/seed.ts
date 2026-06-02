import {
  PrismaClient,
  ProductStatus,
  ProductType,
  UserRole,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function upsertChildCategory(
  slug: string,
  name: string,
  parentId: string,
  description?: string,
) {
  return prisma.category.upsert({
    where: { slug },
    update: { name, parentId, description },
    create: { slug, name, parentId, description },
  });
}

async function main() {
  const adminPass = await bcrypt.hash('Admin1234*', 10);

  const adminUsers = [
    {
      email: 'giovanni@gigasystem.cl',
      firstName: 'Giovanni',
      lastName: 'Admin',
    },
    {
      email: 'admin@gigasystem.local',
      firstName: 'Admin',
      lastName: 'GigaSystem',
    },
  ] as const;

  const adminRole = await prisma.adminRole.upsert({
    where: { slug: 'administrador' },
    update: {},
    create: {
      name: 'Administrador',
      slug: 'administrador',
      description: 'Acceso completo al backoffice',
      isSystem: true,
      permissions: {
        create: [
          'DASHBOARD',
          'ORDERS',
          'PRODUCTS',
          'CATEGORIES',
          'USERS',
          'ROLES',
          'HELP',
          'HOMEPAGE',
          'MARKETING',
        ].map((module) => ({
          module: module as never,
          canView: true,
          canEdit: true,
          canDelete: true,
        })),
      },
    },
  });

  for (const admin of adminUsers) {
    await prisma.user.upsert({
      where: { email: admin.email },
      update: {
        passwordHash: adminPass,
        role: UserRole.ADMIN,
        isActive: true,
        adminRoleId: adminRole.id,
      },
      create: {
        email: admin.email,
        passwordHash: adminPass,
        firstName: admin.firstName,
        lastName: admin.lastName,
        role: UserRole.ADMIN,
        adminRoleId: adminRole.id,
      },
    });
  }

  const componentsRoot = await prisma.category.upsert({
    where: { slug: 'componentes-pc' },
    update: { parentId: null },
    create: { name: 'Componentes PC', slug: 'componentes-pc' },
  });

  const peripheralsRoot = await prisma.category.upsert({
    where: { slug: 'perifericos' },
    update: { parentId: null },
    create: { name: 'Periféricos', slug: 'perifericos' },
  });

  const pcsRoot = await prisma.category.upsert({
    where: { slug: 'pcs-armados' },
    update: { parentId: null },
    create: {
      name: 'PCs armados',
      slug: 'pcs-armados',
      description: 'Equipos completos listos para usar',
    },
  });

  const componentChildren = await Promise.all([
    upsertChildCategory(
      'gabinetes',
      'Gabinetes',
      componentsRoot.id,
      'Torres y chasis para tu build',
    ),
    upsertChildCategory(
      'procesadores',
      'Procesadores',
      componentsRoot.id,
      'CPU Intel y AMD',
    ),
    upsertChildCategory(
      'tarjetas-graficas',
      'Tarjetas gráficas',
      componentsRoot.id,
      'GPU para gaming y trabajo',
    ),
  ]);

  const peripheralChildren = await Promise.all([
    upsertChildCategory('mouse', 'Mouse', peripheralsRoot.id),
    upsertChildCategory('teclados', 'Teclados', peripheralsRoot.id),
    upsertChildCategory('monitores', 'Monitores', peripheralsRoot.id),
    upsertChildCategory('audifonos', 'Audífonos', peripheralsRoot.id),
  ]);

  await upsertChildCategory(
    'pc-gaming',
    'PC Gaming',
    pcsRoot.id,
    'Equipos orientados a juegos',
  );

  const brand = await prisma.brand.upsert({
    where: { slug: 'darkflash' },
    update: {},
    create: { name: 'Darkflash', slug: 'darkflash' },
  });

  const gabinetesCategory = componentChildren[0];

  const product = await prisma.product.upsert({
    where: { slug: 'gabinete-darkflash-demo' },
    update: {
      status: ProductStatus.PUBLISHED,
      pc3dBuilderSlot: 'GABINETE',
      pc3dCaseVariant: 'WHITE',
      pc3dCaseSigla: 'DF-WHITE',
    },
    create: {
      type: ProductType.PC_COMPONENT,
      status: ProductStatus.PUBLISHED,
      brandId: brand.id,
      name: 'Gabinete Darkflash Demo',
      slug: 'gabinete-darkflash-demo',
      shortDesc: 'Gabinete ATX de referencia para catálogo inicial.',
      basePrice: 89900,
      pc3dBuilderSlot: 'GABINETE',
      pc3dCaseVariant: 'WHITE',
      pc3dCaseSigla: 'DF-WHITE',
      specsJson: {
        formFactor: 'ATX Mid Tower',
        fansIncluded: 4,
      },
      categories: {
        createMany: {
          data: [{ categoryId: gabinetesCategory.id }],
        },
      },
    },
  });

  await prisma.productCategory.upsert({
    where: {
      productId_categoryId: {
        productId: product.id,
        categoryId: gabinetesCategory.id,
      },
    },
    update: {},
    create: {
      productId: product.id,
      categoryId: gabinetesCategory.id,
    },
  });

  await prisma.productVariant.upsert({
    where: { sku: 'GAB-DF-001' },
    update: {},
    create: {
      productId: product.id,
      sku: 'GAB-DF-001',
      price: 89900,
      stock: 20,
    },
  });

  await prisma.tag.upsert({
    where: { slug: 'destacado' },
    update: {},
    create: { name: 'Destacado', slug: 'destacado' },
  });

  console.log('Seed ejecutado correctamente');
  console.log(
    `Menú raíz: ${componentsRoot.slug}, ${peripheralsRoot.slug}, ${pcsRoot.slug}`,
  );
  console.log(
    `Subcategorías componentes: ${componentChildren.map((c) => c.slug).join(', ')}`,
  );
  console.log(
    `Subcategorías periféricos: ${peripheralChildren.map((c) => c.slug).join(', ')}`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
