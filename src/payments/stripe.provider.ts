import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentProvider } from './payment-provider.interface';

@Injectable()
export class StripeProvider implements PaymentProvider {
  private readonly stripeSecretKey?: string;

  constructor(configService: ConfigService) {
    this.stripeSecretKey = configService.get<string>('STRIPE_SECRET_KEY');
  }

  async createPayment(input: {
    orderId: string;
    amount: number;
    currency: string;
    idempotencyKey: string;
  }) {
    if (!this.stripeSecretKey) {
      return {
        providerPaymentId: `mock_${input.orderId}`,
        checkoutUrl: undefined,
        status: 'PENDING' as const,
      };
    }

    const body = new URLSearchParams({
      amount: String(Math.round(input.amount * 100)),
      currency: input.currency.toLowerCase(),
      'metadata[orderId]': input.orderId,
    });

    const response = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Idempotency-Key': input.idempotencyKey,
      },
      body,
    });
    const intent = (await response.json()) as { id?: string; status?: string };
    if (!response.ok || !intent.id) {
      return {
        providerPaymentId: `failed_${input.orderId}`,
        checkoutUrl: undefined,
        status: 'FAILED' as const,
      };
    }

    return {
      providerPaymentId: intent.id,
      status:
        intent.status === 'succeeded'
          ? ('SUCCEEDED' as const)
          : ('PENDING' as const),
      checkoutUrl: undefined,
    };
  }
}
