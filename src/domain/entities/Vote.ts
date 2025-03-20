export interface Vote {
    userId: string;
    hasCollected: boolean;
    hasVoted: boolean;
    type?: string | null;
    query?: string | null;
    votedAt: Date;
  }