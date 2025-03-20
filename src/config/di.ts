import { PrismaClient } from '@prisma/client';
import { VoteController } from '../infrastructure/controllers/vote.controller';
import { PrismaVoteRepository } from '../infrastructure/services/PrismaVoteRepository';
import { RegisterVoteUseCase } from '../application/usecases/vote/RegisterVoteUseCase';
import { GetVoteStatusUseCase } from '../application/usecases/vote/GetVoteStatusUseCase';
import { WebhookService } from '../application/services/Webhook.service';

export function setupVoteModule(webHookOauth: string) {
 
  const prismaClient = new PrismaClient();
  

  const voteRepository = new PrismaVoteRepository(prismaClient);
  

  const webhookService = new WebhookService(
    'https://discord.com/api/webhooks/1240122224472625232/3r0xvSUu_qEGUJotAL53f6eAAGdLGrWfIOCMPSUcy9qWYdiBp9wbOqR36xGv5ql8whAS'
  );

  const registerVoteUseCase = new RegisterVoteUseCase(voteRepository, webhookService);
  const getVoteStatusUseCase = new GetVoteStatusUseCase(voteRepository);
  

  const voteController = new VoteController(
    registerVoteUseCase,
    getVoteStatusUseCase,
    webHookOauth
  );
  
  return { voteController };
}
