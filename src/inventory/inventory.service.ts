import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Prisma, StockMovementType } from '@prisma/client';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async reserveStock(
    tx: Prisma.TransactionClient,
    orderId: string,
    lines: Array<{ variantId: string; quantity: number }>,
  ) {
    for (const line of lines) {
      await tx.productVariant.update({
        where: { id: line.variantId },
        data: { stock: { decrement: line.quantity } },
      });

      await tx.allocation.create({
        data: {
          orderId,
          variantId: line.variantId,
          quantity: line.quantity,
          status: 'RESERVED',
        },
      });
      await tx.stockMovement.create({
        data: {
          variantId: line.variantId,
          type: StockMovementType.RESERVE,
          quantity: line.quantity,
          referenceId: orderId,
        },
      });
    }
  }

  movement(
    variantId: string,
    quantity: number,
    type: StockMovementType,
    note?: string,
  ) {
    return this.prisma.stockMovement.create({
      data: { variantId, quantity, type, note },
    });
  }
}
