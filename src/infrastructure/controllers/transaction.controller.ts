import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaTransactionRepository } from '../repositories/prisma-transaction.repository';
import { PaymentGateway } from '../services/payment.gateway';
import { PaymentStatus, TransactionType } from '../../domain/types/transaction.types';
import { PrismaVipRepository } from '../repositories/prisma-vip.repository';
import { ActivateVipUseCase } from '../../application/usecases/vip/activate-vip.usecase';
import { NotificationService } from '../services/notification.service';
import * as dotenv from 'dotenv';
dotenv.config();
  

export class TransactionController {
  constructor(
    private readonly transactionRepository: PrismaTransactionRepository,
    private readonly prismaVipRepository: PrismaVipRepository,
    private readonly paymentGateway: PaymentGateway,
    private readonly activateVipUseCase: ActivateVipUseCase
  ) {}


  public registerRoutes(fastify: FastifyInstance): void {
    fastify.post('/transactions/create', this.createTransaction.bind(this));
    fastify.get('/transactions/user/:userId', this.getUserTransactions.bind(this));
    fastify.get('/transactions/:id', this.getTransactionById.bind(this));
    fastify.post('/transactions/webhook', this.handlePaymentWebhook.bind(this));
    fastify.get('/transactions/stats/:userId', this.getUserStats.bind(this));
    fastify.get('/transactions/cancel', this.cancelTransaction.bind(this));
    fastify.get('/transactions/success', this.successTransaction.bind(this));
    fastify.get('/transactions/success/:sessionId', this.getSuccessDetails.bind(this));
    fastify.post('/transactions/success', this.processSuccessPayment.bind(this));
  }

   async cancelTransaction(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      reply.redirect(`${process.env.FRONTEND_URL}`);
  
    } catch (error) {
      request.log.error({ error }, 'Error canceling transaction');
      reply.status(500).send({ 
        success: false,
        error: 'Failed to cancel transaction' 
      });
    }
  }

async successTransaction(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    const { session_id } = request.query as { session_id: string };

    if (!session_id) {
      reply.status(400).send({
        success: false,
        error: 'Session ID is required'
      });
      return;
    }

    // Buscar a sessão do Stripe usando o session_id
    const session = await this.paymentGateway.retrieveCheckoutSession(session_id);
    
    if (!session) {
      reply.status(404).send({
        success: false,
        error: 'Session not found'
      });
      return;
    }

    // Buscar a transação pelo session_id (que é o paymentId salvo no banco)
    const transaction = await this.transactionRepository.findByPaymentId(session_id);
    
    if (!transaction) {
      reply.status(404).send({
        success: false,
        error: 'Transaction not found'
      });
      return;
    }

    // Se for uma transação VIP, buscar informações do plano
    if (transaction.type === 'VIP') {
      try {
        // Buscar a sessão do Stripe para obter metadados
        const session = await this.paymentGateway.retrieveCheckoutSession(session_id);
        const tierId = session?.metadata?.tierId;
        
        if (tierId) {
          const tier = await this.prismaVipRepository.findTierById(tierId);
          
          if (tier) {
            // Buscar status VIP do usuário
            const vipUser = await this.prismaVipRepository.findUserVip(transaction.user_id);
            
            reply.send({
              success: true,
              data: {
                transaction: {
                  id: transaction.id,
                  amount: transaction.amount,
                  status: transaction.status,
                  createdAt: transaction.createdAt
                },
                vipPlan: {
                  id: tier.id,
                  name: tier.name,
                  price: tier.price,
                  duration: tier.duration,
                  coins: tier.coins,
                  benefits: tier.benefits
                },
                userVip: vipUser ? {
                  isVip: vipUser.isVip,
                  vipType: vipUser.vip_type,
                  expiresAt: new Date(vipUser.vip_timestamp * 1000),
                  daysRemaining: Math.max(0, Math.floor((vipUser.vip_timestamp - Math.floor(Date.now() / 1000)) / (24 * 60 * 60))),
                  autoRenew: vipUser.autoRenew,
                  totalCoins: vipUser.coins
                } : null,
                message: `Parabéns! Você adquiriu o plano VIP ${tier.name} com sucesso!`
              }
            });
            return;
          }
        }
      } catch (error) {
        request.log.error({ error }, 'Error fetching VIP details for success page');
      }
    }

    // Para transações não-VIP ou em caso de erro, retornar informações básicas
    reply.send({
      success: true,
      data: {
        transaction: {
          id: transaction.id,
          amount: transaction.amount,
          status: transaction.status,
          type: transaction.type,
          createdAt: transaction.createdAt
        },
        message: 'Pagamento processado com sucesso!'
      }
    });

  } catch (error) {
    request.log.error({ error }, 'Error processing success transaction');
    reply.status(500).send({ 
      success: false,
      error: 'Failed to process success transaction' 
    });
  }
}


  async createTransaction(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const { userId, type, tierId, metadata } = request.body as any;
      
      const amount = tierId ? (await this.prismaVipRepository.findTierById(tierId))?.price : 0;


      
     
      const paymentSession = await this.paymentGateway.createCheckoutSession({
        userId: userId as string,
        amount: amount as number,
        type: type as string,
        metadata: {
          userId,
          type,
          ...metadata
        }
      });

   
      await this.transactionRepository.create({
        user_id: userId,
        type: type as TransactionType,
        amount: amount as number,
        paymentId: paymentSession.id,
        status: PaymentStatus.PENDING
      });

      
      reply.send({
        success: true,
        paymentUrl: paymentSession.url,
        paymentId: paymentSession.id
      });
    } catch (error) {
      console.log(error)
      request.log.error({ error }, 'Error creating transaction');
      reply.status(500).send({ 
        success: false,
        error: 'Failed to create transaction' 
      });
    }
  }


  async getUserTransactions(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const { userId } = request.params as any;
      const { limit, offset, type, status } = request.query as any;
      
      const transactions = await this.transactionRepository.findByUserId(userId, {
        limit: limit ? parseInt(limit) : undefined,
        offset: offset ? parseInt(offset) : undefined,
        type: type as TransactionType,
        status: status as PaymentStatus
      });
      
      reply.send({
        success: true,
        data: transactions
      });
    } catch (error) {
      request.log.error({ error }, 'Error fetching user transactions');
      reply.status(500).send({ 
        success: false,
        error: 'Failed to fetch transactions' 
      });
    }
  }


  async getTransactionById(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const { id } = request.params as any;
      
      const transaction = await this.transactionRepository.findById(id);
      
      if (!transaction) {
        reply.status(404).send({
          success: false,
          error: 'Transaction not found'
        });
        return;
      }
      
      reply.send({
        success: true,
        data: transaction
      });
    } catch (error) {
      request.log.error({ error }, 'Error fetching transaction');
      reply.status(500).send({ 
        success: false,
        error: 'Failed to fetch transaction' 
      });
    }
  }


  async handlePaymentWebhook(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const event = request.body as any;
      const paymentId = event?.data?.object?.id;
      
      if (!paymentId) {
        reply.status(400).send({ success: false, error: 'Invalid webhook event' });
        return;
      }
      

      const transaction = await this.transactionRepository.findByPaymentId(paymentId);
      
      if (!transaction) {
        reply.status(404).send({ success: false, error: 'Transaction not found' });
        return;
      }
      
    
      let newStatus: PaymentStatus;
      
      switch (event.type) {
        case 'payment_intent.succeeded':
        case 'checkout.session.completed':
          newStatus = PaymentStatus.COMPLETED;
          break;
        case 'payment_intent.payment_failed':
        case 'checkout.session.expired':
          newStatus = PaymentStatus.FAILED;
          break;
        default:
          reply.send({ received: true });
          return;
      }
      
      await this.transactionRepository.updateStatus(transaction.id, newStatus);
      
      // Se o pagamento foi concluído e é uma transação VIP, ativar o VIP
      if (newStatus === PaymentStatus.COMPLETED && transaction.type === 'VIP') {
        try {
          // Buscar o tierId nos metadados da sessão do Stripe
          const session = await this.paymentGateway.retrieveCheckoutSession(paymentId);
          const tierId = session?.metadata?.tierId;
          
          if (tierId) {
            await this.activateVipUseCase.execute({
              userId: transaction.user_id,
              tierId: tierId,
              transactionId: paymentId
            });
          }
        } catch (error) {
          request.log.error({ error }, 'Error activating VIP after payment');
          // Não falhar o webhook se a ativação do VIP falhar
        }
      }

      reply.send({ received: true });
    } catch (error) {
      request.log.error({ error }, 'Error processing payment webhook');
      reply.status(500).send({ success: false, error: 'Failed to process webhook' });
    }
  }

  async getUserStats(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const { userId } = request.params as any;
      
      const stats = await this.transactionRepository.getTransactionStats(userId);
      
      reply.send({
        success: true,
        data: stats
      });
    } catch (error) {
      request.log.error({ error }, 'Error fetching user stats');
      reply.status(500).send({ 
        success: false,
        error: 'Failed to fetch user stats' 
      });
    }
  }

  /**
   * Processa o código de sucesso do Stripe via POST do frontend
   * @param request - FastifyRequest com sessionId no body
   * @param reply - FastifyReply
   */
  async processSuccessPayment(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const { sessionId, userId } = request.body as { sessionId: string; userId?: string };

      if (!sessionId) {
        reply.status(400).send({
          success: false,
          error: 'Session ID is required'
        });
        return;
      }

      // Buscar a sessão do Stripe usando o sessionId
      const session = await this.paymentGateway.retrieveCheckoutSession(sessionId);
      
      if (!session) {
        reply.status(404).send({
          success: false,
          error: 'Session not found'
        });
        return;
      }

      // Buscar a transação pelo sessionId (que é o paymentId salvo no banco)
      const transaction = await this.transactionRepository.findByPaymentId(sessionId);
      
      if (!transaction) {
        reply.status(404).send({
          success: false,
          error: 'Transaction not found for this session ID'
        });
        return;
      }

      // Verificar se a transação foi concluída
      if (transaction.status !== 'COMPLETED') {
        reply.status(400).send({
          success: false,
          error: 'Transaction not completed yet',
          data: {
            status: transaction.status,
            message: 'A transação ainda não foi processada completamente'
          }
        });
        return;
      }

      // Se for uma transação VIP, buscar informações detalhadas do plano
      if (transaction.type === 'VIP') {
        try {
          // Buscar a sessão do Stripe para obter metadados
          const session = await this.paymentGateway.retrieveCheckoutSession(sessionId);
          const tierId = session?.metadata?.tierId;
          
          if (tierId) {
            const tier = await this.prismaVipRepository.findTierById(tierId);
            
            if (tier) {
              // Buscar status VIP atualizado do usuário
              const vipUser = await this.prismaVipRepository.findUserVip(transaction.user_id);
              
              const now = Math.floor(Date.now() / 1000);
              const daysRemaining = vipUser ? Math.max(0, Math.floor((vipUser.vip_timestamp - now) / (24 * 60 * 60))) : 0;
              
              reply.send({
                success: true,
                data: {
                  sessionId: sessionId,
                  transaction: {
                    id: transaction.id,
                    amount: transaction.amount,
                    status: transaction.status,
                    createdAt: transaction.createdAt,
                    type: transaction.type
                  },
                  vipPlan: {
                    id: tier.id,
                    name: tier.name,
                    price: tier.price,
                    duration: tier.duration,
                    coins: tier.coins,
                    benefits: tier.benefits,
                    description: `Plano VIP ${tier.name} com duração de ${tier.duration} dias`
                  },
                  userVip: vipUser ? {
                    isVip: vipUser.isVip,
                    vipType: vipUser.vip_type,
                    expiresAt: new Date(vipUser.vip_timestamp * 1000),
                    daysRemaining: daysRemaining,
                    autoRenew: vipUser.autoRenew,
                    totalCoins: vipUser.coins
                  } : null,
                  benefits: {
                    coinsReceived: tier.coins,
                    durationDays: tier.duration,
                    features: tier.benefits || [],
                    description: `Você recebeu ${tier.coins} moedas e acesso VIP por ${tier.duration} dias`
                  },
                  message: `🎉 Parabéns! Você adquiriu o plano VIP ${tier.name} com sucesso!`,
                  nextSteps: [
                    'Seu status VIP foi ativado automaticamente',
                    `Você recebeu ${tier.coins} moedas na sua conta`,
                    `Seu VIP expira em ${daysRemaining} dias`,
                    vipUser?.autoRenew ? 'A renovação automática está ativada' : 'Considere ativar a renovação automática'
                  ]
                }
              });
              return;
            }
          }
        } catch (error) {
          request.log.error({ error }, 'Error fetching VIP details for success page');
        }
      }

      // Para transações não-VIP, retornar informações básicas
      reply.send({
        success: true,
        data: {
          sessionId: sessionId,
          transaction: {
            id: transaction.id,
            amount: transaction.amount,
            status: transaction.status,
            type: transaction.type,
            createdAt: transaction.createdAt
          },
          message: '✅ Pagamento processado com sucesso!',
          nextSteps: [
            'Sua transação foi concluída',
            'Verifique seu saldo ou status de conta'
          ]
        }
      });

    } catch (error) {
      request.log.error({ error }, 'Error processing success payment');
      reply.status(500).send({ 
        success: false,
        error: 'Failed to process success payment' 
      });
    }
  }

  /**
   * Processa o código de sucesso do Stripe e retorna informações detalhadas do plano comprado
   * @param request - FastifyRequest com sessionId nos params
   * @param reply - FastifyReply
   */
  async getSuccessDetails(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const { sessionId } = request.params as { sessionId: string };

      if (!sessionId) {
        reply.status(400).send({
          success: false,
          error: 'Session ID is required'
        });
        return;
      }

      // Buscar a sessão do Stripe usando o sessionId
      const session = await this.paymentGateway.retrieveCheckoutSession(sessionId);
      
      if (!session) {
        reply.status(404).send({
          success: false,
          error: 'Session not found'
        });
        return;
      }

      // Buscar a transação pelo sessionId (que é o paymentId salvo no banco)
      const transaction = await this.transactionRepository.findByPaymentId(sessionId);
      
      if (!transaction) {
        reply.status(404).send({
          success: false,
          error: 'Transaction not found for this session ID'
        });
        return;
      }

      // Verificar se a transação foi concluída
      if (transaction.status !== 'COMPLETED') {
        reply.status(400).send({
          success: false,
          error: 'Transaction not completed yet',
          data: {
            status: transaction.status,
            message: 'A transação ainda não foi processada completamente'
          }
        });
        return;
      }

      // Se for uma transação VIP, buscar informações detalhadas do plano
      if (transaction.type === 'VIP') {
        try {
          // Buscar a sessão do Stripe para obter metadados
          const session = await this.paymentGateway.retrieveCheckoutSession(sessionId);
          const tierId = session?.metadata?.tierId;
          
          if (tierId) {
            const tier = await this.prismaVipRepository.findTierById(tierId);
            
            if (tier) {
              // Buscar status VIP atualizado do usuário
              const vipUser = await this.prismaVipRepository.findUserVip(transaction.user_id);
              
              const now = Math.floor(Date.now() / 1000);
              const daysRemaining = vipUser ? Math.max(0, Math.floor((vipUser.vip_timestamp - now) / (24 * 60 * 60))) : 0;
              
              reply.send({
                success: true,
                data: {
                  sessionId: sessionId,
                  transaction: {
                    id: transaction.id,
                    amount: transaction.amount,
                    status: transaction.status,
                    createdAt: transaction.createdAt,
                    type: transaction.type
                  },
                  vipPlan: {
                    id: tier.id,
                    name: tier.name,
                    price: tier.price,
                    duration: tier.duration,
                    coins: tier.coins,
                    benefits: tier.benefits,
                    description: `Plano VIP ${tier.name} com duração de ${tier.duration} dias`
                  },
                  userVip: vipUser ? {
                    isVip: vipUser.isVip,
                    vipType: vipUser.vip_type,
                    expiresAt: new Date(vipUser.vip_timestamp * 1000),
                    daysRemaining: daysRemaining,
                    autoRenew: vipUser.autoRenew,
                    totalCoins: vipUser.coins
                  } : null,
                  benefits: {
                    coinsReceived: tier.coins,
                    durationDays: tier.duration,
                    features: tier.benefits || [],
                    description: `Você recebeu ${tier.coins} moedas e acesso VIP por ${tier.duration} dias`
                  },
                  message: `🎉 Parabéns! Você adquiriu o plano VIP ${tier.name} com sucesso!`,
                  nextSteps: [
                    'Seu status VIP foi ativado automaticamente',
                    `Você recebeu ${tier.coins} moedas na sua conta`,
                    `Seu VIP expira em ${daysRemaining} dias`,
                    vipUser?.autoRenew ? 'A renovação automática está ativada' : 'Considere ativar a renovação automática'
                  ]
                }
              });
              return;
            }
          }
        } catch (error) {
          request.log.error({ error }, 'Error fetching VIP details for success page');
        }
      }

      // Para transações não-VIP, retornar informações básicas
      reply.send({
        success: true,
        data: {
          sessionId: sessionId,
          transaction: {
            id: transaction.id,
            amount: transaction.amount,
            status: transaction.status,
            type: transaction.type,
            createdAt: transaction.createdAt
          },
          message: '✅ Pagamento processado com sucesso!',
          nextSteps: [
            'Sua transação foi concluída',
            'Verifique seu saldo ou status de conta'
          ]
        }
      });

    } catch (error) {
      request.log.error({ error }, 'Error processing success details');
      reply.status(500).send({ 
        success: false,
        error: 'Failed to process success details' 
      });
    }
  }
}