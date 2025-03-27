import { Vote } from '../../../domain/entities/Vote';
import { VoteRepository } from '../../../domain/repositories/VoteRepository';
import { WebhookService } from '../../services/Webhook.service';

export class RegisterVoteUseCase {
  constructor(
    private voteRepository: VoteRepository,
    
  ) {}

  async execute(vote: Omit<Vote, 'votedAt'>): Promise<void> {
    const completeVote: Vote = {
      ...vote,
      votedAt: new Date()
    };

    await this.voteRepository.createOrUpdateVote(completeVote);


 
    setTimeout(async () => {
      await this.voteRepository.resetVoteStatus(vote.userId);
    }, 43200000);
  }
}
