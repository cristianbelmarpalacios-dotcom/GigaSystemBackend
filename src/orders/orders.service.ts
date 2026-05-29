import { Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { InventoryService } from '../inventory/inventory.service';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryService: InventoryService,
  ) {}

  async getOrCreateCart(token: string, userId?: string) {
    const cart = await this.prisma.cart.findFirst({
      where: { OR: [{ token }, { userId, isCheckedOut: false }] },
      include: { lines: true },
    });
    if (cart) return cart;
    return this.prisma.cart.create({ data: { token, userId } });
  }

  async addCartLine(
    cartId: string,
    variantId: string,
    quantity: number,
    replace = false,
  ) {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: variantId },
    });
    if (!variant) throw new NotFoundException('Variante no encontrada');

    return this.prisma.cartLine.upsert({
      where: { cartId_variantId: { cartId, variantId } },
      update: replace
        ? { quantity, unitPrice: variant.price }
        : { quantity: { increment: quantity } },
      create: { cartId, variantId, quantity, unitPrice: variant.price },
    });
  }

  async syncCartLines(
    cartId: string,
    lines: Array<{ variantId: string; quantity: number }>,
  ) {
    const cart = await this.prisma.cart.findUnique({ where: { id: cartId } });
    if (!cart) throw new NotFoundException('Carrito no encontrado');

    await this.prisma.cartLine.deleteMany({ where: { cartId } });

    for (const line of lines) {
      if (line.quantity <= 0) continue;
      await this.addCartLine(cartId, line.variantId, line.quantity, true);
    }

    return this.prisma.cart.findUnique({
      where: { id: cartId },
      include: { lines: true },
    });
  }

  async checkoutGuest(
    token: string,
    lines: Array<{ variantId: string; quantity: number }>,
    customer: {
      email: string;
      firstName: string;
      lastName: string;
      phone?: string;
    },
  ) {
    const cart = await this.getOrCreateCart(token);
    await this.syncCartLines(cart.id, lines);
    const refreshed = await this.prisma.cart.findUnique({
      where: { id: cart.id },
      include: { lines: true },
    });
    if (!refreshed?.lines.length) {
      throw new NotFoundException('El carrito está vacío');
    }
    const order = await this.checkout(cart.id);
    return { ...order, customer };
  }

  async checkout(cartId: string, userId?: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { id: cartId },
      include: { lines: { include: { variant: true } } },
    });
    if (!cart) throw new NotFoundException('Carrito no encontrado');

    return this.prisma.$transaction(async (tx) => {
      const subtotal = cart.lines.reduce(
        (acc, line) => acc + Number(line.unitPrice) * line.quantity,
        0,
      );
      const order = await tx.order.create({
        data: {
          orderNumber: `GS-${new Date().getFullYear()}-${Date.now()}`,
          userId,
          status: 'AWAITING_PAYMENT',
          subtotal,
          taxTotal: 0,
          shippingTotal: 0,
          discountTotal: 0,
          grandTotal: subtotal,
          lines: {
            create: cart.lines.map((line) => ({
              variantId: line.variantId,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              productName: line.variant.name ?? line.variant.sku,
              variantSku: line.variant.sku,
            })),
          },
          statusHistory: {
            create: { toStatus: 'AWAITING_PAYMENT', createdById: userId },
          },
        },
      });

      await this.inventoryService.reserveStock(
        tx,
        order.id,
        cart.lines.map((line) => ({
          variantId: line.variantId,
          quantity: line.quantity,
        })),
      );

      await tx.cart.update({
        where: { id: cart.id },
        data: { isCheckedOut: true },
      });
      return order;
    });
  }

  orderByNumber(orderNumber: string) {
    return this.prisma.order.findUnique({
      where: { orderNumber },
      include: {
        lines: true,
        payments: true,
        statusHistory: true,
        shipments: true,
      },
    });
  }

  listAdminOrders(status?: OrderStatus) {
    return this.prisma.order.findMany({
      where: status ? { status } : undefined,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        lines: true,
        payments: true,
        statusHistory: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAdminOrder(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        lines: true,
        payments: true,
        statusHistory: { orderBy: { createdAt: 'desc' } },
        shipments: true,
      },
    });
    if (!order) throw new NotFoundException('Pedido no encontrado');
    return order;
  }

  async updateOrderStatus(
    id: string,
    status: OrderStatus,
    createdById: string,
    note?: string,
  ) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Pedido no encontrado');

    return this.prisma.order.update({
      where: { id },
      data: {
        status,
        statusHistory: {
          create: {
            fromStatus: order.status,
            toStatus: status,
            note,
            createdById,
          },
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        lines: true,
        payments: true,
        statusHistory: { orderBy: { createdAt: 'desc' } },
      },
    });
  }
}
