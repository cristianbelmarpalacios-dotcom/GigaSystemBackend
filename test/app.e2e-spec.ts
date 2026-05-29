import { OrdersService } from '../src/orders/orders.service';
import { PaymentsService } from '../src/payments/payments.service';

describe('Checkout + pago webhook (e2e de dominio)', () => {
  it('reserva stock, crea pago y marca orden pagada', async () => {
    const txOrder = {
      id: 'order-1',
      orderNumber: 'GS-2026-1',
    };
    const prismaMock = {
      cart: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'cart-1',
          lines: [
            {
              variantId: 'var-1',
              quantity: 2,
              unitPrice: 100,
              variant: { sku: 'SKU1', name: 'Producto 1' },
            },
          ],
        }),
        update: jest.fn().mockResolvedValue({}),
      },
      order: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'order-1',
          grandTotal: 200,
          currency: 'COP',
        }),
      },
      payment: {
        create: jest.fn().mockResolvedValue({ id: 'pay-1', status: 'PENDING' }),
        findFirst: jest.fn().mockResolvedValue({
          id: 'pay-1',
          orderId: 'order-1',
          status: 'PENDING',
        }),
        update: jest.fn().mockResolvedValue({}),
      },
      allocation: {
        updateMany: jest.fn().mockResolvedValue({}),
      },
      $transaction: jest.fn((callback: (client: unknown) => unknown) =>
        callback({
          order: {
            create: jest.fn().mockResolvedValue(txOrder),
            update: jest.fn().mockResolvedValue({}),
          },
          cart: { update: jest.fn().mockResolvedValue({}) },
          productVariant: { update: jest.fn().mockResolvedValue({}) },
          allocation: {
            create: jest.fn().mockResolvedValue({}),
            updateMany: jest.fn().mockResolvedValue({}),
          },
          stockMovement: { create: jest.fn().mockResolvedValue({}) },
          payment: { update: jest.fn().mockResolvedValue({}) },
        }),
      ),
    };

    const inventoryService = {
      reserveStock: jest.fn().mockResolvedValue(undefined),
    };
    const stripeProvider = {
      createPayment: jest.fn().mockResolvedValue({
        providerPaymentId: 'pi_1',
        status: 'PENDING',
      }),
    };

    const ordersService = new OrdersService(
      prismaMock as never,
      inventoryService as never,
    );
    const paymentsService = new PaymentsService(
      prismaMock as never,
      stripeProvider,
    );

    const order = await ordersService.checkout('cart-1', 'user-1');
    const payment = await paymentsService.createPayment(
      order.orderNumber,
      'user-1',
    );
    const webhook = await paymentsService.handleWebhook('sig_test', {
      data: { object: { id: 'pi_1' } },
    });

    expect(order.id).toBe('order-1');
    expect(payment.status).toBe('PENDING');
    expect(webhook).toEqual({ ok: true });
    expect(inventoryService.reserveStock).toHaveBeenCalled();
  });
});
