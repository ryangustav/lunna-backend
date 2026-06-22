import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { StripePaymentGateway } from '../services/stripe-payment.gateway';
import { PrismaTransactionRepository } from '../repositories/prisma-transaction.repository';
import { PaymentStatus, TransactionType } from '../../domain/types/transaction.types';

export const COIN_PACKAGES = {
  '10k': { id: '10k', amount: 10000, price: 4.99, bonus: 500 },
  '50k': { id: '50k', amount: 50000, price: 9.99, bonus: 5000 },
  '100k': { id: '100k', amount: 100000, price: 17.99, bonus: 10500 },
  '250k': { id: '250k', amount: 250000, price: 34.99, bonus: 50000 },
  '500k': { id: '500k', amount: 500000, price: 79.99, bonus: 100000 },
  '1m': { id: '1m', amount: 1000000, price: 149.99, bonus: 200000 },
  '5m': { id: '5m', amount: 5000000, price: 249.99, bonus: 500000 },
  '10m': { id: '10m', amount: 10000000, price: 449.99, bonus: 750000 },
};

export class CoinsController {
  constructor(
    private readonly paymentGateway: StripePaymentGateway,
    private readonly transactionRepository: PrismaTransactionRepository
  ) {}

  public registerRoutes(fastify: FastifyInstance): void {
    fastify.post('/coins/purchase', {
      handler: this.purchaseCoins.bind(this),
      onRequest: async (request: FastifyRequest & { user?: any }, reply) => {
        if (!(request as any).requireAuth(reply)) return;
      }
    });

    // Provide the config to the frontend if they want it
    fastify.get('/coins/packages', async (request: FastifyRequest, reply: FastifyReply) => {
      reply.send({
        success: true,
        data: Object.values(COIN_PACKAGES)
      });
    });
  }

  async purchaseCoins(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const { userId, packageId } = request.body as any;
      
      const coinPackage = COIN_PACKAGES[packageId as keyof typeof COIN_PACKAGES];
      
      if (!coinPackage) {
        reply.status(404).send({
          success: false,
          error: 'Coin package not found or invalid'
        });
        return;
      }

      const totalCoinsToReceive = coinPackage.amount + coinPackage.bonus;

      const paymentSession = await this.paymentGateway.createCheckoutSession({
        userId: userId as string,
        amount: coinPackage.price,
        productName: `${coinPackage.amount.toLocaleString()} Lunnar Coins + Bonus`,
        description: `Purchase of ${totalCoinsToReceive.toLocaleString()} total Lunar Coins`,
        type: 'COINS',
        metadata: {
          userId,
          type: 'COINS',
          packageId: coinPackage.id,
          coinsAmount: totalCoinsToReceive.toString()
        }
      });

      // Create a pending transaction
      await this.transactionRepository.create({
        user_id: userId,
        type: 'COINS',
        amount: coinPackage.price,
        paymentId: paymentSession.id,
        status: PaymentStatus.PENDING
      });

      reply.send({
        success: true,
        paymentUrl: paymentSession.url,
        paymentId: paymentSession.id
      });
    } catch (error) {
      request.log.error({ error }, 'Error initiating COINS purchase');
      reply.status(500).send({ 
        success: false,
        error: 'Failed to initiate Coins purchase' 
      });
    }
  }
}
