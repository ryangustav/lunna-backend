import { Vote } from '../entities/Vote';

export interface VoteRepository {
  createOrUpdateVote(vote: Vote): Promise<Vote>;
  getVoteByUserId(userId: string): Promise<Vote | null>;
  markAsCollected(userId: string): Promise<Vote | null>;
  resetVoteStatus(userId: string): Promise<void>;
}
