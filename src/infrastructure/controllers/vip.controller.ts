import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ActivateVipUseCase } from '../../application/usecases/vip/activate-vip.usecase';
import { PrismaVipRepository } from '../repositories/prisma-vip.repository';
import { StripePaymentGateway } from '../services/stripe-payment.gateway';

export class VipController {
  constructor(
    private readonly activateVipUseCase: ActivateVipUseCase,
    private readonly vipRepository: PrismaVipRepository,
    private readonly paymentGateway: StripePaymentGateway
  ) {}


  public registerRoutes(fastify: FastifyInstance): void {

    fastify.post('/vip/activate', {
      handler: this.activateVip.bind(this),
      onRequest: async (request: FastifyRequest & { user?: any }, reply) => {

        if (!(request as any).requireAuth(reply)) return;
      }
    });

    fastify.get('/vip/status/:userId', {
      handler: this.getVipStatus.bind(this),
      onRequest: async (request: FastifyRequest & { user?: any, params?: any }, reply) => {

        if (!(request as any).requireAuth(reply)) return;
        
        const { userId } = request.params as any;
        if (!(request as any).isResourceOwner(userId)) {
          return reply.status(403).send({
            success: false,
            error: 'Forbidden - You do not have permission to access this resource'
          });
        }
      }
    });


    fastify.get('/vip/tiers', this.getVipTiers.bind(this));
    

    fastify.post('/vip/purchase', {
      handler: this.purchaseVip.bind(this),
      onRequest: async (request: FastifyRequest & { user?: any }, reply) => {
        if (!(request as any).requireAuth(reply)) return;
      }
    });
  }

  async activateVip(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const { userId, tierId, transactionId } = request.body as any;
      
      await this.activateVipUseCase.execute({
        userId,
        tierId,
        transactionId
      });
      
      reply.send({ success: true });
    } catch (error) {
      request.log.error({ error }, 'Error activating VIP');
      reply.status(500).send({ 
        success: false,
        error: 'Failed to activate VIP' 
      });
    }
  }


  async getVipStatus(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const { userId } = request.params as any;
      
      const vipStatus = await this.vipRepository.findByUserId(userId);
      
      reply.send({
        success: true,
        data: vipStatus ? {
          isVip: true,
          tier: vipStatus.tierId,
          expiresAt: vipStatus.expiresAt,
          daysRemaining: Math.max(0, Math.floor((vipStatus.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
        } : {
          isVip: false,
          tier: null,
          expiresAt: null,
          daysRemaining: 0
        }
      });
    } catch (error) {
      request.log.error({ error }, 'Error fetching VIP status');
      reply.status(500).send({ 
        success: false,
        error: 'Failed to fetch VIP status' 
      });
    }
  }


  async getVipTiers(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const tiers = await this.vipRepository.getAllTiers();
      
      reply.send({
        success: true,
        data: tiers
      });
    } catch (error) {
      request.log.error({ error }, 'Error fetching VIP tiers');
      reply.status(500).send({ 
        success: false,
        error: 'Failed to fetch VIP tiers' 
      });
    }
  }


  async purchaseVip(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const { userId, tierId } = request.body as any;
      
      const tier = await this.vipRepository.findTierById(tierId);
      
      if (!tier) {
        reply.status(404).send({
          success: false,
          error: 'VIP tier not found'
        });
        return;
      }
      

      const paymentSession = await this.paymentGateway.createCheckoutSession({
        userId: userId as string,
        amount: tier.price as number,
        productName: tier.name as string,
        description: `Purchasing a ${tier.name} vip`,
        type: 'VIP',
        metadata: {
          userId,
          type: 'VIP',
        }
      });
      
      reply.send({
        success: true,
        paymentUrl: paymentSession.url,
        paymentId: paymentSession.id
      });
    } catch (error) {
      console.log(error);
      request.log.error({ error }, 'Error initiating VIP purchase');
      reply.status(500).send({ 
        success: false,
        error: 'Failed to initiate VIP purchase' 
      });
    }
  }
}