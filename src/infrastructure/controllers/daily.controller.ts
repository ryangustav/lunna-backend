import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { fetch } from 'undici';
import * as crypto from 'crypto';

interface AuthPayload {
  userId: string;
  avatar: string | null;
  username: string;
}

export class DailyController {
  constructor(private readonly prisma: PrismaClient) {}

  public registerRoutes(fastify: FastifyInstance): void {
    fastify.get('/daily/status', {
      onRequest: async (request: FastifyRequest & { user?: any }, reply) => {
        if (!(request as any).requireAuth(reply)) return;
      }
    }, this.getDailyStatus.bind(this));

    fastify.post('/daily/collect', {
      onRequest: async (request: FastifyRequest & { user?: any }, reply) => {
        if (!(request as any).requireAuth(reply)) return;
      }
    }, this.collectDaily.bind(this));
  }

  /**
   * Helper to verify hCaptcha token
   */
  private async verifyHCaptcha(token: string): Promise<boolean> {
    const secretKey = process.env.HCAPTCHA_SECRET_KEY || '0x0000000000000000000000000000000000000000';
    try {
      const response = await fetch('https://hcaptcha.com/siteverify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `secret=${secretKey}&response=${token}`,
      });

      const data = await response.json() as { success: boolean };
      return !!data?.success;
    } catch (error) {
      console.error('[DailyController] Error verifying hCaptcha:', error);
      return false;
    }
  }

  /**
   * Helper to find or create a user in the lunarcoins collection
   */
  private async findOrCreateUser(userId: string) {
    let user = await this.prisma.lunarCoins.findUnique({
      where: { user_id: userId }
    });

    if (!user) {
      user = await this.prisma.lunarCoins.create({
        data: {
          user_id: userId,
          coins: 0,
          isVip: false,
          vip_type: 'free',
          language: 'pt',
        }
      });
    }

    return user;
  }

  /**
   * Helper to compute reward based on VIP status
   */
  private async calculateReward(isVip: boolean, vipType: string): Promise<number> {
    const min = isVip ? 2000 : 1000;
    const max = isVip ? 4000 : 2000;
    const baseReward = Math.floor(Math.random() * (max - min + 1)) + min;
    let finalReward = baseReward;

    if (isVip && vipType !== 'free') {
      const tier = await this.prisma.vipTier.findFirst({
        where: { name: vipType }
      });
      if (tier && tier.daily_bonus) {
        finalReward = Math.floor(baseReward * (1 + tier.daily_bonus));
      }
    }

    return finalReward;
  }

  async getDailyStatus(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const userPayload = (request as any).user as AuthPayload;
      const userId = userPayload.userId;

      const user = await this.findOrCreateUser(userId);
      const dailyCollect = await this.prisma.dailyCollect.findUnique({
        where: { user_id: userId }
      });

      const collected = dailyCollect ? dailyCollect.daily_collected : false;
      const reward = await this.calculateReward(user.isVip, user.vip_type);

      reply.send({
        success: true,
        data: {
          collected,
          coins: user.coins,
          reward,
          isVip: user.isVip,
          vipType: user.vip_type
        }
      });
    } catch (error: any) {
      request.log.error(error, 'Error in getDailyStatus');
      reply.status(500).send({ 
        success: false, 
        error: 'Internal Server Error',
        details: error.message || String(error)
      });
    }
  }

  async collectDaily(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const userPayload = (request as any).user as AuthPayload;
      const userId = userPayload.userId;
      const { token } = request.body as { token?: string };

      if (!token) {
        return reply.status(400).send({
          success: false,
          error: 'hCaptcha token is required'
        });
      }

      // Verify captcha
      const isCaptchaValid = await this.verifyHCaptcha(token);
      if (!isCaptchaValid) {
        return reply.status(400).send({
          success: false,
          error: 'Invalid hCaptcha'
        });
      }

      const user = await this.findOrCreateUser(userId);

      // Check if already collected
      const dailyCollect = await this.prisma.dailyCollect.findUnique({
        where: { user_id: userId }
      });

      if (dailyCollect && dailyCollect.daily_collected) {
        return reply.status(400).send({
          success: false,
          error: 'Daily reward already collected today'
        });
      }

      const reward = await this.calculateReward(user.isVip, user.vip_type);

      // 1. Update user coins
      const updatedUser = await this.prisma.lunarCoins.update({
        where: { user_id: userId },
        data: {
          coins: {
            increment: reward
          }
        }
      });

      // 2. Set daily collected status
      await this.prisma.dailyCollect.upsert({
        where: { user_id: userId },
        create: {
          user_id: userId,
          daily_collected: true
        },
        update: {
          daily_collected: true
        }
      });

      // 3. Register transaction in BotTransaction schema
      const transactionId = crypto.randomUUID();
      const timestamp = Math.floor(Date.now() / 1000);
      const language = user.language || 'pt';
      const msg = language === 'en'
        ? `Received ${reward} daily coins`
        : `Recebeu ${reward} moedas diárias`;

      const entry = { id: transactionId, timestamp, mensagem: msg };

      const existingTx = await this.prisma.botTransaction.findUnique({
        where: { user_id: userId }
      });

      if (!existingTx) {
        await this.prisma.botTransaction.create({
          data: {
            user_id: userId,
            transactions: [entry],
            transactions_ids: [transactionId]
          }
        });
      } else {
        const currentTxList = Array.isArray(existingTx.transactions)
          ? existingTx.transactions as any[]
          : [];
        const currentIds = Array.isArray(existingTx.transactions_ids)
          ? existingTx.transactions_ids
          : [];

        let updatedTxList = [...currentTxList, entry];
        let updatedIds = [...currentIds, transactionId];

        if (updatedTxList.length >= 100) {
          updatedTxList = updatedTxList.slice(-99);
          updatedIds = updatedIds.slice(-99);
        }

        await this.prisma.botTransaction.update({
          where: { user_id: userId },
          data: {
            transactions: updatedTxList,
            transactions_ids: updatedIds
          }
        });
      }

      reply.send({
        success: true,
        data: {
          reward,
          newCoins: updatedUser.coins
        }
      });
    } catch (error: any) {
      request.log.error(error, 'Error in collectDaily');
      reply.status(500).send({ 
        success: false, 
        error: 'Internal Server Error',
        details: error.message || String(error),
        stack: error.stack
      });
    }
  }
}
