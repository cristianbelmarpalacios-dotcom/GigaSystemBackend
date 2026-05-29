import {
  OrderStatus,
  PaymentStatus,
  Prisma,
  PrismaClient,
  ProductStatus,
  ProductType,
  UserRole,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

type DemoLine = {
  productSlug: string;
  sku: string;
  quantity: number;
};

type DemoOrder = {
  orderNumber: string;
  status: OrderStatus;
  customerEmail?: string;
  guest?: boolean;
  shippingTotal?: number;
  discountTotal?: number;
  lines: DemoLine[];
  payment?: {
    status: PaymentStatus;
    provider?: string;
  };
  shipment?: {
    carrier: string;
    trackingCode: string;
    status: string;
  };
  history: Array<{
    fromStatus: OrderStatus | null;
    toStatus: OrderStatus;
    note?: string;
    daysAgo: number;
  }>;
  daysAgo: number;
};

const DEMO_PRODUCTS: Array<{
  slug: string;
  name: string;
  type: ProductType;
  sku: string;
  price: number;
  stock: number;
  categorySlug: string;
}> = [
  {
    slug: 'gabinete-darkflash-demo',
    name: 'Gabinete Darkflash Demo',
    type: ProductType.PC_COMPONENT,
    sku: 'GAB-DF-001',
    price: 89900,
    stock: 40,
    categorySlug: 'gabinetes',
  },
  {
    slug: 'procesador-ryzen-7-5800x',
    name: 'AMD Ryzen 7 5800X',
    type: ProductType.PC_COMPONENT,
    sku: 'CPU-R7-5800X',
    price: 249990,
    stock: 25,
    categorySlug: 'procesadores',
  },
  {
    slug: 'gpu-rtx-4060-twin-fan',
    name: 'NVIDIA GeForce RTX 4060 Twin Fan',
    type: ProductType.PC_COMPONENT,
    sku: 'GPU-RTX4060-8G',
    price: 389990,
    stock: 18,
    categorySlug: 'tarjetas-graficas',
  },
  {
    slug: 'mouse-logitech-g502',
    name: 'Mouse Logitech G502 HERO',
    type: ProductType.PERIPHERAL,
    sku: 'MOU-G502-BK',
    price: 54990,
    stock: 60,
    categorySlug: 'mouse',
  },
  {
    slug: 'monitor-samsung-27-144hz',
    name: 'Monitor Samsung 27" 144Hz',
    type: ProductType.PERIPHERAL,
    sku: 'MON-SAM-27-144',
    price: 219990,
    stock: 15,
    categorySlug: 'monitores',
  },
  {
    slug: 'pc-gaming-giga-pro',
    name: 'PC Gaming Giga Pro',
    type: ProductType.PREBUILT_PC,
    sku: 'PC-GIGA-PRO-01',
    price: 1299990,
    stock: 8,
    categorySlug: 'pc-gaming',
  },
  {
    slug: 'teclado-redragon-k552',
    name: 'Teclado Redragon K552 RGB',
    type: ProductType.PERIPHERAL,
    sku: 'TEC-RDK552-RGB',
    price: 39990,
    stock: 45,
    categorySlug: 'teclados',
  },
  {
    slug: 'audifonos-hyperx-cloud-ii',
    name: 'Audífonos HyperX Cloud II',
    type: ProductType.PERIPHERAL,
    sku: 'AUD-HX-CLOUD2',
    price: 79990,
    stock: 30,
    categorySlug: 'audifonos',
  },
];

const DEMO_CUSTOMERS = [
  {
    email: 'maria.gonzalez@gmail.com',
    firstName: 'María',
    lastName: 'González',
    phone: '+56 9 8765 4321',
  },
  {
    email: 'carlos.rojas@outlook.com',
    firstName: 'Carlos',
    lastName: 'Rojas',
    phone: '+56 9 7654 3210',
  },
  {
    email: 'valentina.torres@gmail.com',
    firstName: 'Valentina',
    lastName: 'Torres',
    phone: '+56 9 6543 2109',
  },
  {
    email: 'diego.munoz@yahoo.com',
    firstName: 'Diego',
    lastName: 'Muñoz',
    phone: '+56 9 5432 1098',
  },
  {
    email: 'camila.fernandez@gmail.com',
    firstName: 'Camila',
    lastName: 'Fernández',
    phone: '+56 9 4321 0987',
  },
] as const;

const DEMO_ORDERS: DemoOrder[] = [
  {
    orderNumber: 'GS-DEMO-2026-001',
    status: OrderStatus.DELIVERED,
    customerEmail: 'maria.gonzalez@gmail.com',
    shippingTotal: 4990,
    lines: [
      { productSlug: 'pc-gaming-giga-pro', sku: 'PC-GIGA-PRO-01', quantity: 1 },
      { productSlug: 'monitor-samsung-27-144hz', sku: 'MON-SAM-27-144', quantity: 1 },
    ],
    payment: { status: PaymentStatus.SUCCEEDED, provider: 'stripe' },
    shipment: {
      carrier: 'Starken',
      trackingCode: 'STK-CL-8849201',
      status: 'DELIVERED',
    },
    history: [
      { fromStatus: null, toStatus: OrderStatus.AWAITING_PAYMENT, daysAgo: 12 },
      { fromStatus: OrderStatus.AWAITING_PAYMENT, toStatus: OrderStatus.PAID, note: 'Pago confirmado Webpay', daysAgo: 12 },
      { fromStatus: OrderStatus.PAID, toStatus: OrderStatus.PROCESSING, note: 'Armado en bodega', daysAgo: 11 },
      { fromStatus: OrderStatus.PROCESSING, toStatus: OrderStatus.SHIPPED, note: 'Despacho Starken', daysAgo: 9 },
      { fromStatus: OrderStatus.SHIPPED, toStatus: OrderStatus.DELIVERED, note: 'Entregado al cliente', daysAgo: 6 },
    ],
    daysAgo: 12,
  },
  {
    orderNumber: 'GS-DEMO-2026-002',
    status: OrderStatus.SHIPPED,
    customerEmail: 'carlos.rojas@outlook.com',
    shippingTotal: 3990,
    lines: [
      { productSlug: 'gpu-rtx-4060-twin-fan', sku: 'GPU-RTX4060-8G', quantity: 1 },
      { productSlug: 'procesador-ryzen-7-5800x', sku: 'CPU-R7-5800X', quantity: 1 },
      { productSlug: 'gabinete-darkflash-demo', sku: 'GAB-DF-001', quantity: 1 },
    ],
    payment: { status: PaymentStatus.SUCCEEDED, provider: 'mercadopago' },
    shipment: {
      carrier: 'Chilexpress',
      trackingCode: 'CHX-99281734',
      status: 'IN_TRANSIT',
    },
    history: [
      { fromStatus: null, toStatus: OrderStatus.AWAITING_PAYMENT, daysAgo: 5 },
      { fromStatus: OrderStatus.AWAITING_PAYMENT, toStatus: OrderStatus.PAID, daysAgo: 5 },
      { fromStatus: OrderStatus.PAID, toStatus: OrderStatus.PROCESSING, daysAgo: 4 },
      { fromStatus: OrderStatus.PROCESSING, toStatus: OrderStatus.SHIPPED, note: 'Etiqueta generada', daysAgo: 2 },
    ],
    daysAgo: 5,
  },
  {
    orderNumber: 'GS-DEMO-2026-003',
    status: OrderStatus.PROCESSING,
    customerEmail: 'valentina.torres@gmail.com',
    discountTotal: 15000,
    lines: [
      { productSlug: 'mouse-logitech-g502', sku: 'MOU-G502-BK', quantity: 1 },
      { productSlug: 'teclado-redragon-k552', sku: 'TEC-RDK552-RGB', quantity: 1 },
      { productSlug: 'audifonos-hyperx-cloud-ii', sku: 'AUD-HX-CLOUD2', quantity: 1 },
    ],
    payment: { status: PaymentStatus.SUCCEEDED, provider: 'stripe' },
    history: [
      { fromStatus: null, toStatus: OrderStatus.AWAITING_PAYMENT, daysAgo: 2 },
      { fromStatus: OrderStatus.AWAITING_PAYMENT, toStatus: OrderStatus.PAID, note: 'Cupón GIGA10 aplicado', daysAgo: 2 },
      { fromStatus: OrderStatus.PAID, toStatus: OrderStatus.PROCESSING, note: 'Preparando kit periféricos', daysAgo: 1 },
    ],
    daysAgo: 2,
  },
  {
    orderNumber: 'GS-DEMO-2026-004',
    status: OrderStatus.PAID,
    customerEmail: 'diego.munoz@yahoo.com',
    lines: [{ productSlug: 'monitor-samsung-27-144hz', sku: 'MON-SAM-27-144', quantity: 2 }],
    payment: { status: PaymentStatus.SUCCEEDED, provider: 'webpay' },
    history: [
      { fromStatus: null, toStatus: OrderStatus.AWAITING_PAYMENT, daysAgo: 1 },
      { fromStatus: OrderStatus.AWAITING_PAYMENT, toStatus: OrderStatus.PAID, daysAgo: 1 },
    ],
    daysAgo: 1,
  },
  {
    orderNumber: 'GS-DEMO-2026-005',
    status: OrderStatus.AWAITING_PAYMENT,
    guest: true,
    lines: [
      { productSlug: 'gabinete-darkflash-demo', sku: 'GAB-DF-001', quantity: 1 },
      { productSlug: 'mouse-logitech-g502', sku: 'MOU-G502-BK', quantity: 2 },
    ],
    payment: { status: PaymentStatus.PENDING, provider: 'stripe' },
    history: [{ fromStatus: null, toStatus: OrderStatus.AWAITING_PAYMENT, daysAgo: 0 }],
    daysAgo: 0,
  },
  {
    orderNumber: 'GS-DEMO-2026-006',
    status: OrderStatus.CANCELLED,
    customerEmail: 'camila.fernandez@gmail.com',
    lines: [{ productSlug: 'pc-gaming-giga-pro', sku: 'PC-GIGA-PRO-01', quantity: 1 }],
    payment: { status: PaymentStatus.FAILED, provider: 'mercadopago' },
    history: [
      { fromStatus: null, toStatus: OrderStatus.AWAITING_PAYMENT, daysAgo: 8 },
      { fromStatus: OrderStatus.AWAITING_PAYMENT, toStatus: OrderStatus.CANCELLED, note: 'Pago rechazado por el banco', daysAgo: 7 },
    ],
    daysAgo: 8,
  },
];

function daysAgoDate(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(10 + (days % 8), 15, 0, 0);
  return d;
}

function chileAddress(recipient: string) {
  return {
    recipient,
    line1: 'Av. Providencia 1234, Depto 502',
    line2: 'Edificio Nova',
    city: 'Santiago',
    state: 'Región Metropolitana',
    postalCode: '7500000',
    country: 'CL',
  };
}

async function ensureDemoProducts() {
  const brand = await prisma.brand.upsert({
    where: { slug: 'giga-demo' },
    update: {},
    create: { name: 'Giga Demo', slug: 'giga-demo' },
  });

  for (const item of DEMO_PRODUCTS) {
    const category = await prisma.category.findUnique({
      where: { slug: item.categorySlug },
    });
  if (!category) {
      console.warn(`Categoría ${item.categorySlug} no encontrada, omitiendo ${item.slug}`);
      continue;
    }

    const product = await prisma.product.upsert({
      where: { slug: item.slug },
      update: {
        name: item.name,
        status: ProductStatus.PUBLISHED,
        basePrice: item.price,
      },
      create: {
        type: item.type,
        status: ProductStatus.PUBLISHED,
        brandId: brand.id,
        name: item.name,
        slug: item.slug,
        shortDesc: `${item.name} — producto demo para pedidos.`,
        basePrice: item.price,
        categories: {
          create: { categoryId: category.id },
        },
      },
    });

    await prisma.productCategory.upsert({
      where: {
        productId_categoryId: {
          productId: product.id,
          categoryId: category.id,
        },
      },
      update: {},
      create: { productId: product.id, categoryId: category.id },
    });

    await prisma.productVariant.upsert({
      where: { sku: item.sku },
      update: {
        price: item.price,
        stock: item.stock,
        name: item.name,
      },
      create: {
        productId: product.id,
        sku: item.sku,
        name: item.name,
        price: item.price,
        stock: item.stock,
      },
    });
  }
}

async function ensureDemoCustomers() {
  const pass = await bcrypt.hash('Cliente123*', 10);
  const users: Record<string, string> = {};

  for (const c of DEMO_CUSTOMERS) {
    const user = await prisma.user.upsert({
      where: { email: c.email },
      update: {
        firstName: c.firstName,
        lastName: c.lastName,
        phone: c.phone,
        role: UserRole.CUSTOMER,
        isActive: true,
      },
      create: {
        email: c.email,
        passwordHash: pass,
        firstName: c.firstName,
        lastName: c.lastName,
        phone: c.phone,
        role: UserRole.CUSTOMER,
      },
    });
    users[c.email] = user.id;
  }

  return users;
}

async function resolveVariant(sku: string) {
  const variant = await prisma.productVariant.findUnique({ where: { sku } });
  if (!variant) throw new Error(`Variante no encontrada: ${sku}`);
  return variant;
}

async function seedDemoOrders() {
  await ensureDemoProducts();
  const customerIds = await ensureDemoCustomers();

  for (const demo of DEMO_ORDERS) {
    const existing = await prisma.order.findUnique({
      where: { orderNumber: demo.orderNumber },
    });
    if (existing) {
      console.log(`↷ ${demo.orderNumber} ya existe, se omite`);
      continue;
    }

    const lineRows = await Promise.all(
      demo.lines.map(async (line) => {
        const variant = await resolveVariant(line.sku);
        return {
          variantId: variant.id,
          quantity: line.quantity,
          unitPrice: variant.price,
          productName: variant.name ?? line.productSlug,
          variantSku: variant.sku,
        };
      }),
    );

    const subtotal = lineRows.reduce(
      (acc, line) => acc + Number(line.unitPrice) * line.quantity,
      0,
    );
    const shippingTotal = demo.shippingTotal ?? 0;
    const discountTotal = demo.discountTotal ?? 0;
    const grandTotal = subtotal + shippingTotal - discountTotal;

    const userId =
      demo.guest || !demo.customerEmail
        ? null
        : customerIds[demo.customerEmail] ?? null;

    const customerName = demo.customerEmail
      ? DEMO_CUSTOMERS.find((c) => c.email === demo.customerEmail)
      : null;
    const guestName = demo.guest
      ? { firstName: 'Pedro', lastName: 'Invitado', email: 'pedro.invitado@gmail.com' }
      : null;
    const addressPerson = customerName ?? guestName;

    const createdAt = daysAgoDate(demo.daysAgo);
    const shippingAddress = addressPerson
      ? chileAddress(`${addressPerson.firstName} ${addressPerson.lastName}`)
      : undefined;

    const order = await prisma.order.create({
      data: {
        orderNumber: demo.orderNumber,
        userId,
        status: demo.status,
        subtotal,
        taxTotal: 0,
        shippingTotal,
        discountTotal,
        grandTotal,
        currency: 'CLP',
        billingAddress: shippingAddress as Prisma.InputJsonValue,
        shippingAddress: shippingAddress as Prisma.InputJsonValue,
        createdAt,
        updatedAt: createdAt,
        lines: { create: lineRows },
        statusHistory: {
          create: demo.history.map((h) => ({
            fromStatus: h.fromStatus,
            toStatus: h.toStatus,
            note: h.note,
            createdAt: daysAgoDate(h.daysAgo),
          })),
        },
        payments: demo.payment
          ? {
              create: {
                userId,
                provider: demo.payment.provider ?? 'stripe',
                providerPaymentId: `demo_${demo.orderNumber.toLowerCase()}`,
                amount: grandTotal,
                currency: 'CLP',
                status: demo.payment.status,
                idempotencyKey: `demo-pay-${demo.orderNumber}`,
                metadata: { source: 'seed-orders', demo: true },
                createdAt,
              },
            }
          : undefined,
        shipments: demo.shipment
          ? {
              create: {
                carrier: demo.shipment.carrier,
                trackingCode: demo.shipment.trackingCode,
                status: demo.shipment.status,
                shippingCost: shippingTotal,
                createdAt: daysAgoDate(Math.max(0, demo.daysAgo - 2)),
              },
            }
          : undefined,
      },
    });

    console.log(`✓ ${order.orderNumber} — ${demo.status} — $${Number(grandTotal).toLocaleString('es-CL')} CLP`);
  }
}

async function main() {
  console.log('Insertando pedidos demo…');
  await seedDemoOrders();
  console.log('Listo. Revisa Admin → Pedidos.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
