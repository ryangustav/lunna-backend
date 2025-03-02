import { Stripe } from 'stripe';

export interface PaymentGatewayOptions {
  currency: string;
  successUrl: string;
  cancelUrl: string;
}

export interface CreatePaymentSessionOptions {
  amount: number;
  metadata?: Record<string, any>;
  productName?: string;
  description?: string;
}

export interface PaymentSession {
  id: string;
  url: string;
  status: string;
}

// First, let's define a proper interface for the payment gateway
export interface PaymentGateway {
    createPaymentSession(options: CreatePaymentSessionOptions): Promise<PaymentSession>;
    checkPaymentStatus(paymentId: string): Promise<string>;
    cancelPayment(paymentId: string): Promise<boolean>;
    refundPayment(paymentId: string, amount?: number): Promise<boolean>;
    validateWebhook(signature: string, payload: Buffer, webhookSecret: string): boolean;
  }
  
  // Keep your existing interfaces
  export interface PaymentGatewayOptions {
    currency: string;
    successUrl: string;
    cancelUrl: string;
  }
  
  export interface CreatePaymentSessionOptions {
    amount: number;
    metadata?: Record<string, any>;
    productName?: string;
    description?: string;
  }
  
  export interface PaymentSession {
    id: string;
    url: string;
    status: string;
  }
  
  // Now implement the interface in your class
  export class StripePaymentGateway implements PaymentGateway {
    [x: string]: any;
    constructor(
      private readonly stripe: Stripe,
      private readonly options: PaymentGatewayOptions
    ) {}
  
    /**
     * Cria uma sessão de pagamento no Stripe
     */
    async createPaymentSession(options: CreatePaymentSessionOptions): Promise<PaymentSession> {
      try {
        const session = await this.stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          line_items: [
            {
              price_data: {
                currency: this.options.currency,
                product_data: {
                  name: options.productName || 'Payment',
                  description: options.description || 'Transaction payment',
                },
                unit_amount: Math.round(options.amount * 100), // Stripe usa centavos
              },
              quantity: 1,
            },
          ],
          mode: 'payment',
          success_url: this.options.successUrl,
          cancel_url: this.options.cancelUrl,
          metadata: options.metadata,
        });
  
        return {
          id: session.id,
          url: session.url || '',
          status: session.status || 'created',
        };
      } catch (error) {
        console.error('Error creating payment session:', error);
        throw new Error('Failed to create payment session');
      }
    }
  
    /**
     * Verifica o status de um pagamento
     */
    async checkPaymentStatus(paymentId: string): Promise<string> {
      try {
        const session = await this.stripe.checkout.sessions.retrieve(paymentId);
        return session.payment_status || 'unknown';
      } catch (error) {
        console.error('Error checking payment status:', error);
        throw new Error('Failed to check payment status');
      }
    }
  
    /**
     * Cancela um pagamento pendente
     */
    async cancelPayment(paymentId: string): Promise<boolean> {
      try {
        // Para sessões de checkout, não podemos cancelar diretamente
        // Podemos apenas expirar a sessão
        await this.stripe.checkout.sessions.expire(paymentId);
        return true;
      } catch (error) {
        console.error('Error canceling payment:', error);
        throw new Error('Failed to cancel payment');
      }
    }
  
    /**
     * Reembolsa um pagamento
     */
    async refundPayment(paymentId: string, amount?: number): Promise<boolean> {
      try {
        const session = await this.stripe.checkout.sessions.retrieve(paymentId);
        
        if (!session.payment_intent) {
          throw new Error('No payment intent found for this session');
        }
  
        // Stripe usa o conceito de Payment Intent para reembolsos
        const paymentIntentId = typeof session.payment_intent === 'string' 
          ? session.payment_intent 
          : session.payment_intent.id;
  
        await this.stripe.refunds.create({
          payment_intent: paymentIntentId,
          amount: amount ? Math.round(amount * 100) : undefined, // reembolso parcial ou total
        });
  
        return true;
      } catch (error) {
        console.error('Error refunding payment:', error);
        throw new Error('Failed to refund payment');
      }
    }
  
    public constructWebhookEvent(payload: any, signature: string): any {
      try {
        // Usar a API do Stripe para verificar a assinatura
        return this.stripe.webhooks.constructEvent(
          payload, 
          signature, 
          this.config.stripeWebhookSecret
        );
      } catch (error) {
        throw new Error(`Webhook Error: ${(error as Error).message}`);
      }
    }
    
    validateWebhook(signature: string, payload: Buffer, webhookSecret: string): boolean {
      try {
        this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
        return true;
      } catch (error) {
        console.error('Webhook signature verification failed:', error);
        return false;
      }
    }
  }