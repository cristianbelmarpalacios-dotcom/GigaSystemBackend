import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OrdersService } from './orders.service';

@Controller('v1')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('cart')
  cart(
    @Body() body: { token: string },
    @Req() req: { user?: { userId: string } },
  ) {
    return this.ordersService.getOrCreateCart(body.token, req.user?.userId);
  }

  @Post('cart/:cartId/lines')
  addLine(
    @Param('cartId') cartId: string,
    @Body() body: { variantId: string; quantity: number },
  ) {
    return this.ordersService.addCartLine(
      cartId,
      body.variantId,
      body.quantity,
    );
  }

  @Post('orders/checkout')
  @UseGuards(JwtAuthGuard)
  checkout(
    @Body() body: { cartId: string },
    @Req() req: { user: { userId: string } },
  ) {
    return this.ordersService.checkout(body.cartId, req.user.userId);
  }

  @Post('orders/checkout-guest')
  checkoutGuest(
    @Body()
    body: {
      token: string;
      lines: Array<{ variantId: string; quantity: number }>;
      customer: {
        email: string;
        firstName: string;
        lastName: string;
        phone?: string;
      };
    },
  ) {
    return this.ordersService.checkoutGuest(
      body.token,
      body.lines,
      body.customer,
    );
  }

  @Get('orders')
  order(@Query('orderNumber') orderNumber: string) {
    return this.ordersService.orderByNumber(orderNumber);
  }
}
