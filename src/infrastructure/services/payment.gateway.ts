export interface PaymentGateway {
    [x: string]: any;
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

    createCheckoutSession(params: {
      userId: string;
      amount: number;
      type: string;
      description?: string;
      productName?: string;
      metadata?: Record<string, string>;
    }): Promise<{ url: string; id: string }>;
  }