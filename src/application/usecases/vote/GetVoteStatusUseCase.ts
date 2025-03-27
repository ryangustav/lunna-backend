import { VoteRepository } from '../../../domain/repositories/VoteRepository';

interface VoteStatus {
  hasVoted: boolean;
  hasCollected: boolean;
  type?: string | null;
  query?: string | null;
}

export class GetVoteStatusUseCase {
  constructor(private voteRepository: VoteRepository) {}

  async execute(userId: string): Promise<VoteStatus> {
    const vote = await this.voteRepository.getVoteByUserId(userId);
    
    if (!vote) {
      return { hasVoted: false, hasCollected: false };
    }


    await this.voteRepository.markAsCollected(userId);
    
    return {
      hasVoted: vote.hasVoted,
      hasCollected: vote.hasCollected,
      type: vote.type,
      query: vote.query
    };
  }
}