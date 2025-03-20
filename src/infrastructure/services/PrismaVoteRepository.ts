import { PrismaClient } from '@prisma/client';
import { Vote } from '../../domain/entities/Vote';
import { VoteRepository } from '../../domain/repositories/VoteRepository';

export class PrismaVoteRepository implements VoteRepository {
  constructor(private prisma: PrismaClient) {}

  async createOrUpdateVote(vote: Vote): Promise<Vote> {
    return await this.prisma.vote.upsert({
      where: { userId: vote.userId },
      update: {
        hasCollected: vote.hasCollected,
        hasVoted: vote.hasVoted,
        type: vote.type,
        query: vote.query,
        votedAt: vote.votedAt
      },
      create: {
        userId: vote.userId,
        hasCollected: vote.hasCollected,
        hasVoted: vote.hasVoted,
        type: vote.type,
        query: vote.query,
        votedAt: vote.votedAt
      }
    });
  }

  async getVoteByUserId(userId: string): Promise<Vote | null> {
    return await this.prisma.vote.findUnique({
      where: { userId }
    });
  }

  async markAsCollected(userId: string): Promise<Vote | null> {
    return await this.prisma.vote.update({
      where: { userId },
      data: { hasCollected: true, hasVoted: false }
    });
  }

  async resetVoteStatus(userId: string): Promise<void> {
    await this.prisma.vote.update({
      where: { userId },
      data: { hasCollected: false, hasVoted: false }
    });
  }
}
