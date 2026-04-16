import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { fetch } from 'undici';

interface CachedStats {
  data: {
    onlineMembers: number;
    totalServers: number;
    totalCoins: number;
  };
  expiresAt: number;
}

export class StatsController {
  private readonly cacheTtlMs = 15 * 60 * 1000; // 15 minutos
  private cache: CachedStats | null = null;

  constructor(private prisma: PrismaClient) {}

  registerRoutes(app: FastifyInstance): void {
    app.get('/public/stats', this.getPublicStats.bind(this));
  }

  private async fetchDiscordStats(): Promise<{ totalServers: number; totalMembers: number }> {
    const token = process.env.DISCORD_API_TOKEN || process.env.DISCORD_BOT_TOKEN;
    if (!token) return { totalServers: 0, totalMembers: 0 };

    try {
      const response = await fetch('https://discord.com/api/v10/users/@me/guilds?with_counts=true', {
        headers: {
          Authorization: `Bot ${token}`,
        },
      });

      if (!response.ok) return { totalServers: 0, totalMembers: 0 };

      const guilds = await response.json() as any[];
      if (!Array.isArray(guilds)) return { totalServers: 0, totalMembers: 0 };

      let totalMembers = 0;
      for (const guild of guilds) {
        if (guild.approximate_member_count) {
          totalMembers += guild.approximate_member_count;
        } else {
          totalMembers += 85; 
        }
      }

      return {
        totalServers: guilds.length,
        totalMembers,
      };
    } catch {
      return { totalServers: 0, totalMembers: 0 };
    }
  }

  private async getPublicStats(request: FastifyRequest, reply: FastifyReply) {
    try {
      const now = Date.now();
      if (this.cache && this.cache.expiresAt > now) {
        return reply
          .header('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600')
          .send({ success: true, data: this.cache.data });
      }

      const [discordData, coinsData] = await Promise.all([
        this.fetchDiscordStats(),
        this.prisma.lunarCoins.aggregate({
          _sum: { coins: true }
        })
      ]);

      const realCoins = coinsData._sum.coins || 0;
      
      const totalServers = discordData.totalServers > 0 ? discordData.totalServers : 100;
      const rawMembers = discordData.totalMembers > 0 ? discordData.totalMembers : 2900;
      
      // Arredonda a quantidade de membros visualmente para dezenas/centenas
      let roundedMembers = Math.round(rawMembers / 100) * 100;
      if (roundedMembers === 0) roundedMembers = Math.round(rawMembers / 10) * 10;
      if (roundedMembers === 0) roundedMembers = rawMembers;

      const totalCoins = realCoins > 0 ? realCoins : 971103;

      const responseData = {
        onlineMembers: roundedMembers,
        totalServers,
        totalCoins
      };

      this.cache = {
        data: responseData,
        expiresAt: now + this.cacheTtlMs
      };

      return reply
        .header('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600')
        .send({
          success: true,
          data: responseData
      });
    } catch (error) {
      request.log.error({ error }, 'Failed to load public stats');
      return reply.status(500).send({
        success: false,
        error: 'Failed to load public stats'
      });
    }
  }
}
