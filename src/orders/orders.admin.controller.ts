import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AdminModule, OrderStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { PermissionsGuard } from '../rbac/permissions.guard';
import { RequirePermission } from '../rbac/require-permission.decorator';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrdersService } from './orders.service';

@Controller('v1/admin/orders')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('ADMIN', 'STAFF')
export class OrdersAdminController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @RequirePermission(AdminModule.ORDERS, 'view')
  list(@Query('status') status?: OrderStatus) {
    return this.ordersService.listAdminOrders(status);
  }

  @Get(':id')
  @RequirePermission(AdminModule.ORDERS, 'view')
  get(@Param('id') id: string) {
    return this.ordersService.getAdminOrder(id);
  }

  @Patch(':id/status')
  @RequirePermission(AdminModule.ORDERS, 'edit')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
    @Req() req: { user: { userId: string } },
  ) {
    return this.ordersService.updateOrderStatus(
      id,
      dto.status,
      req.user.userId,
      dto.note,
    );
  }
}
