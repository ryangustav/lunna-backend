import { Vote } from '../../../domain/entities/Vote';
import { VoteRepository } from '../../../domain/repositories/VoteRepository';
import { WebhookService } from '../../services/Webhook.service';

export class RegisterVoteUseCase {
  constructor(
    private voteRepository: VoteRepository,
    private webhookService: WebhookService
  ) {}

  async execute(vote: Omit<Vote, 'votedAt'>): Promise<void> {
    const completeVote: Vote = {
      ...vote,
      votedAt: new Date()
    };

    await this.voteRepository.createOrUpdateVote(completeVote);
    
    // Enviar notificação para o webhook do Discord
    await this.webhookService.sendDiscordNotification({
      
      content: `<:gold_donator:1053256617518440478> | O usuario <@${vote.userId}> (\`${vote.userId}\`) acaba de votar!`
    });

    // Configurar timeout para resetar o status após 12 horas (43200000 ms)
    setTimeout(async () => {
      await this.voteRepository.resetVoteStatus(vote.userId);
    }, 43200000);
  }
}
