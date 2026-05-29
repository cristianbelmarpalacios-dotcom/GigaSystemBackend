import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { StockMovementType } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { InventoryService } from './inventory.service';

@Controller('v1/admin/inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'STAFF')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post('movement')
  movement(
    @Body()
    body: {
      variantId: string;
      quantity: number;
      type: StockMovementType;
      note?: string;
    },
  ) {
    return this.inventoryService.movement(
      body.variantId,
      body.quantity,
      body.type,
      body.note,
    );
  }
}
