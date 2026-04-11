import Stripe from "stripe";
import { PaymentConfig } from "../../config/payment.config";
import { PaymentGateway } from "./payment.gateway";

export class StripePaymentGateway implements PaymentGateway {
  constructor(
    private stripe: Stripe,
    private config: typeof PaymentConfig
  ) {}

  /**
   * Creates a checkout session for processing payments.
   *
   * @param params - The parameters for creating a checkout session.
   * @param params.userId - The ID of the user initiating the transaction.
   * @param params.amount - The amount to be charged, in the smallest currency unit.
   * @param params.type - The type of transaction (e.g., 'VIP', 'Lunar Coins').
   * @param params.metadata - Optional metadata associated with the transaction.
   *
   * @returns A promise that resolves to an object containing the session URL and ID.
   */
  async createCheckoutSession(params: {
    userId: string;
    productName?: string;
    description?: string;
    amount: number;
    type: string;
    metadata?: Record<string, string>;
  }): Promise<{ url: string; id: string }> {
    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: this.config.currency,
          product_data: {
            name: params.productName || 'Payment',
            description: params.description || 'Transaction payment',
          },
          unit_amount: params.amount * 100, 
        },
        quantity: 1,
      }],
      metadata: {
        userId: params.userId,
        type: params.type,
        ...params.metadata,
      },
      success_url: this.config.successUrl,
      cancel_url: this.config.cancelUrl,
    });

    return {
      url: session.url!,
      id: session.id,
    };
  }

  /**
   * Retrieves a checkout session by its ID.
   * 
   * @param sessionId - The ID of the checkout session to retrieve.
   * @returns A promise that resolves to the session data or null if not found.
   */
  async retrieveCheckoutSession(sessionId: string): Promise<any> {
    try {
      const session = await this.stripe.checkout.sessions.retrieve(sessionId);
      return session;
    } catch (error) {
      console.error('Error retrieving checkout session:', error);
      return null;
    }
  }
}
