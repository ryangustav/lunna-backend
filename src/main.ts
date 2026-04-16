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
import { GuildSettingsRepository } from './infrastructure/repositories/GuildSettingsRepository';
import { ManageGuildSettingsUseCase } from './application/usecases/ManageGuildSettings';
import { GuildSettingsController } from './infrastructure/controllers/guildsettings.controller';
import { VipController } from './infrastructure/controllers/vip.controller';
import { DiscordOAuthController } from './infrastructure/controllers/discord.controller';
import { PrismaAuthRepository } from './infrastructure/repositories/PrismaAuthRepository';
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
import fastifySwagger from '@fastify/swagger';
import fastifyScalarUi from '@scalar/fastify-api-reference';
import { AIController } from './infrastructure/controllers/ai-controller';
import { PrismaRPGRepository } from './infrastructure/repositories/prisma-rpg.repository';
import { RPGController } from './infrastructure/controllers/rpg.controller';
import { CommandsController } from './infrastructure/controllers/commands.controller';
import { StatsController } from './infrastructure/controllers/stats.controller';




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
    origin: ['https://lunnabot.fun', 'https://www.lunnabot.fun', 'https://api.lunnabot.fun'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
    credentials: true,
  });

  await app.register(fastifySwagger, {
    swagger: {
      info: {
        title: 'Lunna API',
        description: 'Documentação da API oficial da Lunna Bot',
        version: '1.0.0'
      },
      host: 'api.lunnabot.fun',
      basePath: '/v1',
      schemes: ['https'],
      consumes: ['application/json'],
      produces: ['application/json'],
      securityDefinitions: {
        apiKey: {
          type: 'apiKey',
          name: 'Authorization',
          in: 'header'
        }
      }
    }
  });

  await app.register(fastifyScalarUi, {
    routePrefix: '/v1/docs',
    configuration: {
      title: 'Lunna API Reference',
      spec: {
        content: () => app.swagger()
      }
    }
  });

  await app.register(authPlugin, {
    secret: process.env.JWT_SECRET!,
    skipRoutes: ['/v1/docs', '/v1/docs/*', '/v1/vip/activate', '/v1/ai/generate','/v1/transactions/webhook', '/v1/upload-image','/v1/cleanup-images', '/v1/backgrounds/:filename', '/v1/base/', '/v1/insignias/', '/v1/search/:filename', "/v1/vote/get-voted", "/v1/vote/webhook", '/', '/v1/auth/login', '/v1/transactions/cancel', '/v1/transactions/success', '/v1/auth/register', '/v1/vip/tiers', '/v1/auth/discord', '/v1/auth/discord/callback', '/v1/auth/logout', '/v1/commands/public', '/v1/public/stats']
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
  
  const uploadImageUseCase = new UploadImageUseCase(imageRepository, imagesFolder);
  const checkImageExistsUseCase = new CheckImageExistsUseCase(imageRepository, imagesFolder);

  const paymentGateway = new StripePaymentGateway(stripe, {
    stripeSecretKey: PaymentConfig.stripeSecretKey,
    stripeWebhookSecret: PaymentConfig.stripeWebhookSecret,
    currency: PaymentConfig.currency,
    successUrl: PaymentConfig.successUrl,
    cancelUrl: PaymentConfig.cancelUrl,
    mercadoPagoSecretKey: PaymentConfig.mercadoPagoSecretKey
  });
  
  const notificationService = new DiscordNotificationService(process.env.WEBHOOK_OAUTH!);
  const vipRepository = new PrismaVipRepository(prisma);
  const transactionRepository = new PrismaTransactionRepository(prisma);

  const activateVipUseCase = new ActivateVipUseCase(
    vipRepository,
    transactionRepository,
    notificationService
  );

  const AiController = new AIController(process.env.GEMINI_TOKEN!);

  const imageController = new ImageController(
    uploadImageUseCase,
    checkImageExistsUseCase,
    'https://api.lunnabot.fun/v1'
  );

  const transactionController = new TransactionController(
    transactionRepository,
    vipRepository,
    paymentGateway,
    activateVipUseCase
  );

  const vipController = new VipController(
    activateVipUseCase,
    vipRepository,
    paymentGateway
  );

  const guildSettingsRepository = new GuildSettingsRepository(prisma);
  const authRepository = new PrismaAuthRepository(prisma);
  const DiscordController = new DiscordOAuthController(authRepository, guildSettingsRepository);

  const manageGuildSettingsUseCase = new ManageGuildSettingsUseCase(guildSettingsRepository);
  const guildSettingsController = new GuildSettingsController(manageGuildSettingsUseCase);

  const rpgRepository = new PrismaRPGRepository(prisma);
  const rpgController = new RPGController(rpgRepository);
  const commandsController = new CommandsController();
  const statsController = new StatsController(prisma);


  // Grouping ALL routes under /v1
  await app.register(async (v1) => {
    transactionController.registerRoutes(v1);
    vipController.registerRoutes(v1);
    DiscordController.registerRoutes(v1);
    imageController.registerRoutes(v1);
    AiController.registerRoutes(v1);
    guildSettingsController.registerRoutes(v1);
    rpgController.registerRoutes(v1);
    commandsController.registerRoutes(v1);
    statsController.registerRoutes(v1);
    setupVoteModule(process.env.TOP_GG!, process.env.WEBHOOK_VOTE!).voteController.registerRoutes(v1);
  }, { prefix: '/v1' });

  const getVoteStatusUseCase = new GetVoteStatusUseCase(
    new PrismaVoteRepository(prisma)
  );

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