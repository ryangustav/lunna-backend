import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { RegisterVoteUseCase } from '../../application/usecases/vote/RegisterVoteUseCase';
import { GetVoteStatusUseCase } from '../../application/usecases/vote/GetVoteStatusUseCase';
import Topgg from '@top-gg/sdk';
import { WebhookService } from '../../application/services/Webhook.service';

interface GetVoteStatusQuery {
  id: string;
}

interface Vote {
  userId: string;
  hasCollected: boolean;
  hasVoted: boolean;
  type?: string | null;
  query?: string | null;
  votedAt: Date;
}

export class VoteController {
  private webhookAuth: string;
  private processedUserVotes: Map<string, number> = new Map();
 
  /**
   * Creates a new VoteController instance.
   * @param registerVoteUseCase The use case to use for registering votes.
   * @param getVoteStatusUseCase The use case to use for getting vote status.
   * @param topggWebhookAuth The authorization token for the Top.gg webhook.
   */
  constructor(
    private registerVoteUseCase: RegisterVoteUseCase,
    private getVoteStatusUseCase: GetVoteStatusUseCase,
    private webhookService: WebhookService,
    topggWebhookAuth: string
  ) {
    this.webhookAuth = topggWebhookAuth;
  }

  /**
   * Registers routes for vote-related endpoints.
   * @param fastify The Fastify instance to register the routes with.
   */
  registerRoutes(fastify: FastifyInstance) {

    fastify.post('/vote/webhook', async (request: FastifyRequest, reply: FastifyReply) => {
      const authorization = request.headers.authorization;
     

      if (authorization !== this.webhookAuth) {
        console.log(`Autorização inválida: ${authorization}`);
        return reply.status(401).send({ error: 'Unauthorized' });
      }
     
      const vote = request.body as Topgg.WebhookPayload;
      
      console.log(vote)

      const lastProcessed = this.processedUserVotes.get(vote.user);
      const now = Date.now();
      
      if (lastProcessed && (now - lastProcessed < 1800000)) { 
        console.log(`Ignorando voto duplicado para usuário ${vote.user} - último processado há ${Math.floor((now - lastProcessed)/1000)} segundos`);
        return reply.send({ success: true, ignored: true });
      }
  
      this.processedUserVotes.set(vote.user, now);
      console.log(`Novo voto registrado para usuário: ${vote.user}`);
      

      await this.handleVote(vote);
      
      const entriesToClear = [...this.processedUserVotes.entries()]
        .filter(([_, timestamp]) => now - timestamp > 43200000);
      
      for (const [key] of entriesToClear) {
        this.processedUserVotes.delete(key);
      }
      
      await this.webhookService.sendDiscordNotification({
        content: `<:gold_donator:1053256617518440478> | O usuario <@${vote.user}> (\`${vote.user}\`) acaba de votar!`
      });

      return reply.send({ success: true });
    });

    fastify.get('/vote/get-voted', async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.query as GetVoteStatusQuery;
       
        if (!id) {
          return reply.status(400).send({ error: 'User ID is required' });
        }
       
        const voteStatus = await this.getVoteStatusUseCase.execute(id);
       
        if (voteStatus.hasVoted && !voteStatus.hasCollected) {
          await this.registerVoteUseCase.execute({
            userId: id,
            hasCollected: true,
            hasVoted: false,
            type: voteStatus.type,
            query: voteStatus.query
          });
        }

        console.log(voteStatus)
       
        reply.send(voteStatus);
      } catch (error) {
        console.error('Error getting vote status:', error);
        reply.status(500).send({ error: 'Internal server error' });
      }
    });
  }

/**
 * Handles a vote received from the Top.gg webhook.
 * 
 * @param vote The payload received from the Top.gg webhook containing vote details.
 * 
 * The function logs the vote details, converts the query to a string if it's an object,
 * and registers the vote using the RegisterVoteUseCase. It also sets a timeout to reset
 * the vote status after 12 hours.
 */

  private async handleVote(vote: Topgg.WebhookPayload) {
    console.log(vote);
   

    const queryValue = typeof vote.query === 'object' ?
      JSON.stringify(vote.query) :
      vote.query;
   
    await this.registerVoteUseCase.execute({
      userId: vote.user,
      hasCollected: false,
      hasVoted: true,
      type: vote.type,
      query: queryValue
    });
   
   
    setTimeout(async () => {
      await this.registerVoteUseCase.execute({
        userId: vote.user,
        hasCollected: false,
        hasVoted: false,
        type: vote.type,
        query: queryValue
      });
    }, 43200000);
  }
}