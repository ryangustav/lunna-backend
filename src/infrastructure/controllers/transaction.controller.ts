import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaTransactionRepository } from '../repositories/prisma-transaction.repository';
import { PaymentGateway } from '../services/payment.gateway';
import { PaymentStatus, TransactionType } from '../../domain/types/transaction.types';
import { PrismaVipRepository } from '../repositories/prisma-vip.repository';
import * as dotenv from 'dotenv';
dotenv.config();
  

export class TransactionController {
  constructor(
    private readonly transactionRepository: PrismaTransactionRepository,
    private readonly prismaVipRepository: PrismaVipRepository,
    private readonly paymentGateway: PaymentGateway
  ) {}


  public registerRoutes(fastify: FastifyInstance): void {
    fastify.post('/transactions/create', this.createTransaction.bind(this));
    fastify.get('/transactions/user/:userId', this.getUserTransactions.bind(this));
    fastify.get('/transactions/:id', this.getTransactionById.bind(this));
    fastify.post('/transactions/webhook', this.handlePaymentWebhook.bind(this));
    fastify.get('/transactions/stats/:userId', this.getUserStats.bind(this));
    fastify.get('/transactions/cancel', this.cancelTransaction.bind(this));
    fastify.get('/transactions/success', this.successTransaction.bind(this));
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

    reply.redirect(`${process.env.FRONTEND_URL}`);
  } catch (error) {
    request.log.error({ error }, 'Error canceling transaction');
    reply.status(500).send({ 
      success: false,
      error: 'Failed transaction has been canceled' 
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
}