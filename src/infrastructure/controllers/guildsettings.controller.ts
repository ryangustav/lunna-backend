import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ManageGuildSettingsUseCase } from '../../application/usecases/ManageGuildSettings';
import { IGuildSettings } from '../../domain/entities/GuildSettings';

export class GuildSettingsController {
    constructor(private manageGuildSettingsUseCase: ManageGuildSettingsUseCase) {}

    registerRoutes(app: FastifyInstance) {
        // Obter configurações de um servidor
        app.get<{ Params: { guildId: string } }>(
            '/guilds/:guildId/settings',
            {
                // Requires authentication middleware if integrated
            },
            async (request, reply) => {
                try {
                    const { guildId } = request.params;
                    const settings = await this.manageGuildSettingsUseCase.getSettings(guildId);
                    return reply.send(settings);
                } catch (error) {
                    app.log.error(error);
                    return reply.status(500).send({ error: 'Internal Server Error' });
                }
            }
        );

        // Atualizar configurações de um servidor
        app.patch<{ Params: { guildId: string }; Body: any }>(
            '/guilds/:guildId/settings',
            {
                // Requires authentication middleware if integrated
            },
            async (request, reply) => {
                try {
                    const { guildId } = request.params;
                    const data = request.body as Partial<IGuildSettings>;
                    const updatedSettings = await this.manageGuildSettingsUseCase.updateSettings(guildId, data);
                    return reply.send(updatedSettings);
                } catch (error) {
                    app.log.error(error);
                    return reply.status(500).send({ error: 'Internal Server Error' });
                }
            }
        );
    }
}
