import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RbacModule } from '../rbac/rbac.module';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { OrdersAdminController } from './orders.admin.controller';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [InventoryModule, AuthModule, RbacModule],
  providers: [OrdersService],
  controllers: [OrdersController, OrdersAdminController],
  exports: [OrdersService],
})
export class OrdersModule {}
