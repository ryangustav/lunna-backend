import { PrismaClient, Prisma } from '@prisma/client';
import { IGuildSettingsRepository } from '../../domain/repositories/IGuildSettingsRepository';
import { IGuildSettings, GuildSettings } from '../../domain/entities/GuildSettings';

export class GuildSettingsRepository implements IGuildSettingsRepository {
    private prisma: PrismaClient;

    constructor() {
        this.prisma = new PrismaClient();
    }

    async findByGuildId(guildId: string): Promise<IGuildSettings | null> {
        const result = await this.prisma.guildSettings.findUnique({
            where: { guild_id: guildId }
        });

        if (!result) return null;

        return new GuildSettings({
            id: result.id,
            guild_id: result.guild_id,
            prefix: result.prefix,
            language: result.language,
            mod_log_channel: result.mod_log_channel,
            welcome_channel: result.welcome_channel,
            quarantine_role: result.quarantine_role,
            anti_spam: result.anti_spam as any,
            anti_invite: result.anti_invite as any,
            anti_link: result.anti_link as any
        });
    }

    async upsertSettings(guildId: string, data: Partial<IGuildSettings>): Promise<IGuildSettings> {
        // Prepare JSON fields carefully ensuring valid states
        const antiSpamDefaults = { enabled: false, message_threshold: 5, time_window: 5, action: "warn" };
        const antiInviteDefaults = { enabled: false, whitelisted_channels: [], action: "warn" };
        const antiLinkDefaults = { enabled: false, whitelisted_domains: [], action: "warn" };

        const createData = {
            guild_id: guildId,
            prefix: data.prefix ?? '-',
            language: data.language ?? 'pt',
            mod_log_channel: data.mod_log_channel,
            welcome_channel: data.welcome_channel,
            quarantine_role: data.quarantine_role,
            anti_spam: (data.anti_spam as Prisma.InputJsonValue) ?? antiSpamDefaults,
            anti_invite: (data.anti_invite as Prisma.InputJsonValue) ?? antiInviteDefaults,
            anti_link: (data.anti_link as Prisma.InputJsonValue) ?? antiLinkDefaults
        };

        const updateData: any = {
            ...(data.prefix !== undefined && { prefix: data.prefix }),
            ...(data.language !== undefined && { language: data.language }),
            ...(data.mod_log_channel !== undefined && { mod_log_channel: data.mod_log_channel }),
            ...(data.welcome_channel !== undefined && { welcome_channel: data.welcome_channel }),
            ...(data.quarantine_role !== undefined && { quarantine_role: data.quarantine_role }),
            ...(data.anti_spam !== undefined && { anti_spam: data.anti_spam as Prisma.InputJsonValue }),
            ...(data.anti_invite !== undefined && { anti_invite: data.anti_invite as Prisma.InputJsonValue }),
            ...(data.anti_link !== undefined && { anti_link: data.anti_link as Prisma.InputJsonValue })
        };

        const result = await this.prisma.guildSettings.upsert({
            where: { guild_id: guildId },
            update: updateData,
            create: createData
        });

        return new GuildSettings({
            id: result.id,
            guild_id: result.guild_id,
            prefix: result.prefix,
            language: result.language,
            mod_log_channel: result.mod_log_channel,
            welcome_channel: result.welcome_channel,
            quarantine_role: result.quarantine_role,
            anti_spam: result.anti_spam as any,
            anti_invite: result.anti_invite as any,
            anti_link: result.anti_link as any
        });
    }
}
