import { IGuildSettings } from '../../domain/entities/GuildSettings';
import { IGuildSettingsRepository } from '../../domain/repositories/IGuildSettingsRepository';

export class ManageGuildSettingsUseCase {
    constructor(private repository: IGuildSettingsRepository) {}

    async getSettings(guildId: string): Promise<IGuildSettings> {
        let settings = await this.repository.findByGuildId(guildId);
        if (!settings) {
            // Upsert baseline settings if not exists
            settings = await this.repository.upsertSettings(guildId, {});
        }
        return settings;
    }

    async updateSettings(guildId: string, data: Partial<IGuildSettings>): Promise<IGuildSettings> {
        return this.repository.upsertSettings(guildId, data);
    }
}
