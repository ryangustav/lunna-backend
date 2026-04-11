import { IGuildSettings } from '../../entities/GuildSettings';

export interface IGuildSettingsRepository {
    findByGuildId(guildId: string): Promise<IGuildSettings | null>;
    upsertSettings(guildId: string, data: Partial<IGuildSettings>): Promise<IGuildSettings>;
}
