import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { fetch } from 'undici';
import { discordConfig } from '../../config/discord.config';

interface DiscordCommandOption {
  name: string;
  required?: boolean;
}

interface DiscordApplicationCommand {
  name: string;
  description?: string;
  options?: DiscordCommandOption[];
}

interface PublicCommandDTO {
  name: string;
  description: string;
  usage: string;
  category: string;
}

interface CachedPayload {
  data: PublicCommandDTO[];
  expiresAt: number;
}

export class CommandsController {
  private readonly cacheTtlMs = 5 * 60 * 1000;
  private cache: CachedPayload | null = null;

  registerRoutes(app: FastifyInstance): void {
    app.get('/commands/public', this.getPublicCommands.bind(this));
  }

  private async getPublicCommands(request: FastifyRequest, reply: FastifyReply) {
    try {
      const commands = await this.getOrLoadCommands();

      return reply
        .header('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600')
        .send({
          success: true,
          count: commands.length,
          data: commands,
        });
    } catch (error) {
      request.log.error({ error }, 'Failed to load public commands');
      return reply.status(500).send({
        success: false,
        error: 'Failed to load commands',
      });
    }
  }

  private async getOrLoadCommands(): Promise<PublicCommandDTO[]> {
    const now = Date.now();
    if (this.cache && this.cache.expiresAt > now) return this.cache.data;

    const fromDiscord = await this.fetchDiscordCommands();
    const data = fromDiscord.length > 0 ? fromDiscord : this.getFallbackCommands();

    this.cache = {
      data,
      expiresAt: now + this.cacheTtlMs,
    };

    return data;
  }

  private async fetchDiscordCommands(): Promise<PublicCommandDTO[]> {
    const token = process.env.DISCORD_BOT_TOKEN;
    const applicationId = process.env.DISCORD_CLIENT_ID || discordConfig.clientId;

    if (!token || !applicationId) return [];

    const response = await fetch(`https://discord.com/api/v10/applications/${applicationId}/commands`, {
      headers: {
        Authorization: `Bot ${token}`,
      },
    });

    if (!response.ok) return [];

    const payload = (await response.json()) as DiscordApplicationCommand[];
    if (!Array.isArray(payload)) return [];

    return payload
      .filter((command) => command?.name)
      .map((command) => ({
        name: `/${command.name}`,
        description: command.description || 'No description provided.',
        usage: this.buildUsage(command),
        category: this.inferCategory(command.name),
      }));
  }

  private buildUsage(command: DiscordApplicationCommand): string {
    const optionParts = (command.options || []).map((option) =>
      option.required ? `<${option.name}>` : `[${option.name}]`
    );
    return [`/${command.name}`, ...optionParts].join(' ').trim();
  }

  private inferCategory(commandName: string): string {
    const name = commandName.toLowerCase();
    if (name.includes('mod') || name.includes('ban') || name.includes('mute')) return 'Moderation';
    if (name.includes('shop') || name.includes('daily') || name.includes('coin')) return 'Economy';
    if (name.includes('quest') || name.includes('rpg') || name.includes('dungeon')) return 'RPG';
    if (name.includes('vip') || name.includes('premium')) return 'VIP';
    return 'General';
  }

  private getFallbackCommands(): PublicCommandDTO[] {
    return [
      {
        name: '/daily',
        description: 'Collect your daily coins reward.',
        usage: '/daily',
        category: 'Economy',
      },
      {
        name: '/profile',
        description: 'View your profile and progression data.',
        usage: '/profile [user]',
        category: 'RPG',
      },
      {
        name: '/shop',
        description: 'Open the shop and browse available items.',
        usage: '/shop [category]',
        category: 'Economy',
      },
      {
        name: '/mod mute',
        description: 'Mute a user for a configurable duration.',
        usage: '/mod mute <user> [duration] [reason]',
        category: 'Moderation',
      },
    ];
  }
}

