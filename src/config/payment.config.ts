import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ 
  path: path.resolve(__dirname, '../../src/environments/.env') 
});

export const PaymentConfig = {
    stripeSecretKey: process.env.STRIPE_SECRET_KEY!,
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
    currency: 'BRL',
    successUrl: `${process.env.SITE_URL}/transactions/success?session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${process.env.SITE_URL}/transactions/cancel`,
    mercadoPagoSecretKey: process.env.MERCADO_PAGO_SECRET_KEY!,
  };