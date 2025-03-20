import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ActivateVipUseCase } from '../../application/usecases/vip/activate-vip.usecase';
import { PrismaVipRepository } from '../repositories/prisma-vip.repository';
import { StripePaymentGateway } from '../services/stripe-payment.gateway';

