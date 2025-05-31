import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { Stripe } from 'stripe';
import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import colors from 'colors';
import { StripePaymentGateway } from './infrastructure/services/stripe-payment.gateway';
import { DiscordNotificationService } from './infrastructure/services/discord-notification.service';
import { PrismaVipRepository } from './infrastructure/repositories/prisma-vip.repository';
import { PrismaTransactionRepository } from './infrastructure/repositories/prisma-transaction.repository';
import { LoggerService } from './infrastructure/services/logger.service';
import { ActivateVipUseCase } from './application/usecases/vip/activate-vip.usecase';
import { CheckExpiringVipsUseCase } from './application/usecases/vip/check-expiring-vips.usecase';
import { RegisterVoteUseCase } from './application/usecases/vote/RegisterVoteUseCase';
import { GetVoteStatusUseCase } from './application/usecases/vote/GetVoteStatusUseCase';
import { VipScheduler } from './infrastructure/schedule/vip.schedule';
import { PaymentConfig } from './config/payment.config';
import { TransactionController } from './infrastructure/controllers/transaction.controller';
import { VipController } from './infrastructure/controllers/vip.controller';
import { DiscordOAuthController } from './infrastructure/controllers/discord.controller';
import { VoteController } from './infrastructure/controllers/vote.controller';
import { ImageController } from './infrastructure/controllers/image.controller';
import { UploadImageUseCase } from './application/usecases/image/UploadImageUseCase';
import { CheckImageExistsUseCase } from './application/usecases/image/CheckImageExistsUseCase';
import { WebhookService } from './application/services/Webhook.service';
import { PrismaVoteRepository } from './infrastructure/services/PrismaVoteRepository';
import securityPlugin from './infrastructure/plugins/security.plugin';
import authPlugin from './infrastructure/plugins/auth.plugin';
import { setupVoteModule } from './config/di';
import { join } from 'path';
import { FileSystemImageRepository } from './infrastructure/repositories/FileSystemImageRepository';
import fastifyMultipart from '@fastify/multipart';
import { AIController } from './infrastructure/controllers/ai-controller';



/**
 * Creates a Fastify server with the necessary plugins and services registered.
 * The server has rate limiting, helmet, and bot protection enabled.
 * It also has a logger service, a discord notification service, and a payment gateway.
 * The discord notification service is used to send notifications to a discord channel.
 * The payment gateway is used to handle payments.
 * The server also has a vote controller, a transaction controller, and a vip controller.
 * The vote controller is used to handle votes.
 * The transaction controller is used to handle transactions.
 * The vip controller is used to handle vip subscriptions.
 * The server also has a vip scheduler that runs every minute and checks for expiring vip subscriptions.
 * If a subscription is expiring, it sends a notification to the discord channel.
 *
 * @returns {FastifyInstance} The created server.
 */
async function createServer(): Promise<FastifyInstance> {

  dotenv.config();
  

  const topggWebhookAuth =  `${process.env.TOP_GG!}`;

  const app = Fastify({
    logger: true,
    trustProxy: true
  });


  app.register(LoggerService);


  await app.register(securityPlugin, {
    rateLimiting: {
      enabled: true,
      max: 100,
      timeWindow: '1 minute'
    },
    helmet: {
      enabled: true,
      contentSecurityPolicy: true
    },
    botProtection: {
      enabled: true,
      blockSuspiciousBots: process.env.NODE_ENV === 'production'
    },
    redisUrl: process.env.REDIS_URL
  });
  
  await app.register(cors, {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
    credentials: true,
  });

  await app.register(authPlugin, {
    secret: process.env.JWT_SECRET!,
    skipRoutes: ['/ai/generate','/transactions/webhook', '/upload-image','/cleanup-images', '/backgrounds/:filename', '/base/', '/insignias/', '/search/:filename', "/vote/get-voted", "/vote/webhook", "/", '/auth/login', '/transactions/cancel', '/transactions/success', '/auth/register', '/vip/tiers', '/auth/discord', '/auth/discord/callback', '/auth/logout']
  });

  await app.register(fastifyMultipart, {
    limits: {
      fileSize: 5 * 1024 * 1024, 
      files: 1                   
    }
  });



  const prisma = new PrismaClient({
    log: ['error', 'warn']
  });


  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-02-24.acacia'
  });


  const rootPath = process.cwd();
  const imagesFolder = join(rootPath, 'src','uploads', 'backgrounds');
  const metadataFolder = join(rootPath, 'src', 'data');
  
 
  const imageRepository = new FileSystemImageRepository(metadataFolder);
  
 
  const uploadImageUseCase = new UploadImageUseCase(
    imageRepository,
    imagesFolder
  );
  
  const checkImageExistsUseCase = new CheckImageExistsUseCase(
    imageRepository,
    imagesFolder
  );
  



  const paymentGateway = new StripePaymentGateway(stripe, {
    stripeSecretKey: PaymentConfig.stripeSecretKey,
    stripeWebhookSecret: PaymentConfig.stripeWebhookSecret,
    currency: PaymentConfig.currency,
    successUrl: PaymentConfig.successUrl,
    cancelUrl: PaymentConfig.cancelUrl,
    mercadoPagoSecretKey: PaymentConfig.mercadoPagoSecretKey
  });
  
  const notificationService = new DiscordNotificationService(
    process.env.WEBHOOK_OAUTH!
  );


  const vipRepository = new PrismaVipRepository(prisma);
  const transactionRepository = new PrismaTransactionRepository(prisma);


  const activateVipUseCase = new ActivateVipUseCase(
    vipRepository,
    transactionRepository,
    notificationService
  );

  const AiController = new AIController(process.env.GEMINI_TOKEN!);

  const DiscordController = new DiscordOAuthController();

  // Criar controller
  const imageController = new ImageController(
    uploadImageUseCase,
    checkImageExistsUseCase,
    'https://lunna-api.discloud.app'
  );
  const getVoteStatusUseCase = new GetVoteStatusUseCase(
    new PrismaVoteRepository(prisma)
  )
 
  setupVoteModule(process.env.TOP_GG!, process.env.WEBHOOK_VOTE!).voteController.registerRoutes(app);

  const transactionController = new TransactionController(
    transactionRepository,
    vipRepository,
    paymentGateway
  );

  const vipController = new VipController(
    activateVipUseCase,
    vipRepository,
    paymentGateway
  );

  transactionController.registerRoutes(app);
  vipController.registerRoutes(app);
  DiscordController.registerRoutes(app);
  imageController.registerRoutes(app);
  AiController.registerRoutes(app);

 const checkExpiringVipsUseCase = new CheckExpiringVipsUseCase(
  vipRepository,
  paymentGateway,
  {
    info: (message: string, metadata?: Record<string, any>) => {
      console.log(
        colors.bgBlue.black(' ℹ️ INFO ') +
        colors.blue(` ${message}`),
        metadata || ''
      );
      app.log.info(metadata || {}, message);
    },
    error: (message: string, metadata?: Record<string, any>) => {
      console.log(
        colors.bgRed.white(' ❌ ERROR ') +
        colors.red(` ${message}`),
        metadata || ''
      );
      app.log.error(metadata || {}, message);
    },
    warn: (message: string, metadata?: Record<string, any>) => {
      console.log(
        colors.bgYellow.black(' ⚠️ WARN ') +
        colors.yellow(` ${message}`),
        metadata || ''
      );
      app.log.warn(metadata || {}, message);
    },
    debug: (message: string, metadata?: Record<string, any>) => {
      console.log(
        colors.bgWhite.white(' 🔍 DEBUG ') +
        colors.gray(` ${message}`),
        metadata || ''
      );
      app.log.debug(metadata || {}, message);
    }
  }
);


  const vipScheduler = new VipScheduler(checkExpiringVipsUseCase);
  vipScheduler.start();


 app.addHook('onClose', async () => {
  console.log(colors.bgYellow.black(' 🔄 SHUTDOWN ') + colors.yellow(' Server shutting down...'));
  await prisma.$disconnect();
});
  return app;
}

async function bootstrap() {
  try {
    const server = await createServer();
    const port = parseInt(process.env.PORT || '8080', 10);


    await server.listen({ port, host: '0.0.0.0' });
console.log(
  colors.bgGreen.black(' 🚀 SERVER ') +
  colors.green(` Server listening on localhost:${port}`)
);

  } catch (error) {
console.error(
  colors.bgRed.white(' 💥 FATAL ') +
  colors.red(' Failed to start server:'),
  error
);
    process.exit(1);
  }
}


process.on('uncaughtException', (error) => {
console.error(
  colors.bgRed.white(' 💥 UNCAUGHT ') +
  colors.red(' Uncaught Exception:'),
  error
);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
console.error(
  colors.bgRed.white(' 💥 UNHANDLED ') +
  colors.red(' Unhandled Rejection:'),
  error
);
  process.exit(1);
});

bootstrap();

export { createServer };