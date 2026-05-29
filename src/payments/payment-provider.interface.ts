export interface CreatePaymentResult {
  providerPaymentId: string;
  checkoutUrl?: string;
  status: 'PENDING' | 'SUCCEEDED' | 'FAILED';
}

export interface PaymentProvider {
  createPayment(input: {
    orderId: string;
    amount: number;
    currency: string;
    idempotencyKey: string;
  }): Promise<CreatePaymentResult>;
}
