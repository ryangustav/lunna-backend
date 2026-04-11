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

    fastify.post('/vip/activate', this.activateVip.bind(this));

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

    fastify.put('/vip/auto-renewal', {
      handler: this.updateAutoRenewal.bind(this),
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
      
    
      const vipUser = await this.vipRepository.findUserVip(userId);
      
      if (vipUser && vipUser.isVip) {
        const now = Math.floor(Date.now() / 1000);
        const daysRemaining = Math.max(0, Math.floor((vipUser.vip_timestamp - now) / (24 * 60 * 60)));
        
        reply.send({
          success: true,
          data: {
            isVip: true,
            tier: vipUser.vip_type,
            expiresAt: new Date(vipUser.vip_timestamp * 1000),
            daysRemaining: daysRemaining,
            autoRenew: vipUser.autoRenew,
            coins: vipUser.coins
          }
        });
      } else {
        reply.send({
          success: true,
          data: {
            isVip: false,
            tier: null,
            expiresAt: null,
            daysRemaining: 0,
            autoRenew: false,
            coins: 0
          }
        });
      }
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

  async updateAutoRenewal(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const { userId, autoRenew } = request.body as any;
      
      if (typeof autoRenew !== 'boolean') {
        reply.status(400).send({
          success: false,
          error: 'autoRenew must be a boolean value'
        });
        return;
      }
      
      await this.vipRepository.updateAutoRenewal(userId, autoRenew);
      
      reply.send({
        success: true,
        message: `Auto-renewal ${autoRenew ? 'enabled' : 'disabled'} successfully`
      });
    } catch (error) {
      request.log.error({ error }, 'Error updating auto-renewal');
      reply.status(500).send({ 
        success: false,
        error: 'Failed to update auto-renewal' 
      });
    }
  }
}