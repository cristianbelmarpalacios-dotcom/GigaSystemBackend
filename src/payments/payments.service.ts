import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { randomUUID } from 'crypto';
import { StripeProvider } from './stripe.provider';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly provider: StripeProvider,
  ) {}

  async createPayment(orderNumber: string, userId?: string) {
    const order = await this.prisma.order.findUnique({
      where: { orderNumber },
    });
    if (!order) throw new NotFoundException('Pedido no encontrado');

    const idempotencyKey = randomUUID();
    const result = await this.provider.createPayment({
      orderId: order.id,
      amount: Number(order.grandTotal),
      currency: order.currency,
      idempotencyKey,
    });

    return this.prisma.payment.create({
      data: {
        orderId: order.id,
        userId,
        provider: 'stripe',
        providerPaymentId: result.providerPaymentId,
        amount: order.grandTotal,
        currency: order.currency,
        status: result.status,
        idempotencyKey,
      },
    });
  }

  async handleWebhook(signature: string | undefined, payload: unknown) {
    if (!signature) throw new BadRequestException('Firma faltante');
    const providerPaymentId = (
      payload as { data?: { object?: { id?: string } } }
    )?.data?.object?.id;
    if (!providerPaymentId) throw new BadRequestException('Payload inválido');

    const payment = await this.prisma.payment.findFirst({
      where: { providerPaymentId },
    });
    if (!payment) return { ignored: true };
    if (payment.status === 'SUCCEEDED') return { idempotent: true };

    return this.prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: 'SUCCEEDED',
          metadata: payload as Prisma.InputJsonValue,
        },
      });
      await tx.order.update({
        where: { id: payment.orderId },
        data: {
          status: 'PAID',
          statusHistory: {
            create: { fromStatus: 'AWAITING_PAYMENT', toStatus: 'PAID' },
          },
        },
      });
      await tx.allocation.updateMany({
        where: { orderId: payment.orderId, status: 'RESERVED' },
        data: { status: 'CONSUMED' },
      });
      return { ok: true };
    });
  }
}
