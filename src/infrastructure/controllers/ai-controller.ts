import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { GeminiClient, GeminiHistory } from '../gateways/GeminiClient';

export class AIController {
  constructor(
    private readonly geminiToken: string,
  ) {}

  public registerRoutes(fastify: FastifyInstance): void {
    fastify.post('/ai/generate', this.generate.bind(this));
  }

  private async generate(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    const {
      history,
      prompt,
      userId,
      comandos,
    } = request.body as {
      history: GeminiHistory[];
      prompt: string;
      userId: string;
      comandos: string;
    };

    const geminiClient = new GeminiClient(this.geminiToken);
    const response = await geminiClient.startChat(history, prompt, comandos);

    reply.send(response);
  }
}
