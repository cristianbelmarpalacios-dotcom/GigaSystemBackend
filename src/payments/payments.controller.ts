import {
  Body,
  Controller,
  Headers,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PaymentsService } from './payments.service';

@Controller('v1/payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create')
  @UseGuards(JwtAuthGuard)
  create(
    @Body() body: { orderNumber: string },
    @Req() req: { user?: { userId: string } },
  ) {
    return this.paymentsService.createPayment(
      body.orderNumber,
      req.user?.userId,
    );
  }

  @Post('webhook/stripe')
  webhook(
    @Headers('stripe-signature') signature: string | undefined,
    @Body() payload: unknown,
  ) {
    return this.paymentsService.handleWebhook(signature, payload);
  }
}
