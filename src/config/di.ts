import { PrismaClient } from '@prisma/client';
import { VoteController } from '../infrastructure/controllers/vote.controller';
import { PrismaVoteRepository } from '../infrastructure/services/PrismaVoteRepository';
import { RegisterVoteUseCase } from '../application/usecases/vote/RegisterVoteUseCase';
import { GetVoteStatusUseCase } from '../application/usecases/vote/GetVoteStatusUseCase';
import { WebhookService } from '../application/services/Webhook.service';

export function setupVoteModule(webHookOauth: string, webhookUrl: string) {
 
  const prismaClient = new PrismaClient();
  

  const voteRepository = new PrismaVoteRepository(prismaClient);
  

  const webhookService = new WebhookService(
    webhookUrl
  );

  const registerVoteUseCase = new RegisterVoteUseCase(voteRepository);
  const getVoteStatusUseCase = new GetVoteStatusUseCase(voteRepository);
  

  const voteController = new VoteController(
    registerVoteUseCase,
    getVoteStatusUseCase,
    webhookService,
    webHookOauth
  );
  
  return { voteController };
}
