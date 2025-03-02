import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fetch from 'node-fetch';
import * as jwt from 'jsonwebtoken';
import { discordConfig } from '../../config/discord.config';

// Interfaces
interface DiscordUser {
  id: string;
  username: string;
  global_name: string;
  discriminator: string;
  avatar: string | null;
  email?: string;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}

export interface AuthPayload {
  userId: string;
  avatar: string | null;
  username: string;
}

interface AuthOptions {
  secret: string;
  skipRoutes?: string[];
}

// Middleware de autenticação
export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
  options: AuthOptions
) {
  const { secret, skipRoutes = [ '/auth/discord', '/auth/discord/callback', '/auth/logout' ] } = options;


  if (request.method === 'OPTIONS') {
    return;
  }

  if (skipRoutes.some(route => request.url.startsWith(route))) {
    return;
  }

  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log("❌ Token not provided");
    return reply.status(401).send({
      success: false,
      error: 'Unauthorized - Token not provided'
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, secret) as AuthPayload;
    (request as any).user = payload;
  } catch (error) {
    return reply.status(401).send({
      success: false,
      error: 'Unauthorized - Invalid token'
    });
  }
}


export function registerAuthMiddleware(
  fastify: FastifyInstance,
  options: { secret: string; routePrefix?: string; skipRoutes?: string[] }
) {
  const { secret, skipRoutes = [] } = options;

  fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!skipRoutes.some(route => request.url.startsWith(route))) {
      await authMiddleware(request, reply, { secret });
    }
  });
}



export class DiscordOAuthController {
  private readonly JWT_SECRET: string;
  private readonly JWT_EXPIRATION: string;
  private readonly FRONTEND_URL: string;

  constructor() {
    this.JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-key';
    this.JWT_EXPIRATION = process.env.JWT_EXPIRATION || '1d';
    this.FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
  }

  public registerRoutes(fastify: FastifyInstance): void {
    fastify.get('/auth/discord', this.redirectToDiscord.bind(this));
    fastify.get('/auth/discord/callback', this.handleCallback.bind(this));
    fastify.get('/auth/me', this.getCurrentUser.bind(this));
    fastify.get('/auth/logout', this.logout.bind(this));
  }


  async redirectToDiscord(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const authUrl = new URL('https://discord.com/api/oauth2/authorize');
    authUrl.searchParams.append('client_id', discordConfig.clientId);
    authUrl.searchParams.append('redirect_uri', discordConfig.redirectUri);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('scope', discordConfig.scopes.join(' '));
    
    reply.redirect(authUrl.toString());
  }

  async handleCallback(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const { code } = request.query as { code: string };
      
      if (!code) {
        request.log.error('No code provided in Discord callback');
        return reply.redirect(`${this.FRONTEND_URL}?error=no_code`);
      }

      const tokenResponse = await this.exchangeCode(code);
      
      if (!tokenResponse) {
        request.log.error('Failed to exchange code for token');
        return reply.redirect(`${this.FRONTEND_URL}?error=token_exchange_failed`);
      }

      const userData = await this.fetchDiscordUser(tokenResponse.access_token);
      
      if (!userData) {
        request.log.error('Failed to fetch Discord user data');
        return reply.redirect(`${this.FRONTEND_URL}?error=user_data_failed`);
      }

      const jwtPayload: AuthPayload = { 
        userId: userData.id,
        avatar: userData.avatar ? `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.png` : null,
        username: userData.global_name
      };
      
      const token = jwt.sign(
        jwtPayload,
        this.JWT_SECRET as jwt.Secret,
        { expiresIn: `1d` }
      );

      reply.redirect(`${this.FRONTEND_URL}?token=${token}`);
      
    } catch (error) {
      request.log.error({ error }, 'Error processing Discord callback');
      reply.redirect(`${this.FRONTEND_URL}?error=server_error`);
    }
  }


  async getCurrentUser(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const req = request as any;
    const userFromReq = req.user;


    if (!userFromReq) {
      try {
        const authHeader = request.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
          const token = authHeader.split(' ')[1];
          const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-key';
          
          const manualDecoded = jwt.verify(token, JWT_SECRET) as AuthPayload;
          
          return reply.send({
            success: true,
            data: manualDecoded
          });
        }
      } catch (error) {
        console.error("❌ Manual token decode failed:", error);
      }
    }
    

    if (!userFromReq || !userFromReq.userId) {
      return reply.status(400).send({
        success: false,
        error: 'User ID missing in the token'
      });
    }
    
    
    reply.send({
      success: true,
      data: userFromReq
    });
  }

  
  
  // Método para buscar o usuário no Discord usando o ID
  private async fetchDiscordUserFromToken(userId: string): Promise<DiscordUser | null> {
    try {
      const response = await fetch(`https://discord.com/api/users/${userId}`, {
        headers: {
          Authorization: `Bearer ${process.env.DISCORD_API_TOKEN}` 
        } 
      });
  
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Discord API error: ${response.status} - ${errorText}`);
      }
  
      return await response.json() as DiscordUser;
    } catch (error) {
      console.error('Error fetching Discord user data:', error);
      return null;
    }
  }
  


  async logout(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    reply.send({
      success: true,
      message: 'Logout successful'
    });
  }

  private async exchangeCode(code: string): Promise<TokenResponse | null> {
    try {
      const params = new URLSearchParams();
      params.append('client_id', discordConfig.clientId);
      params.append('client_secret', discordConfig.clientSecret);
      params.append('grant_type', 'authorization_code');
      params.append('code', code);
      params.append('redirect_uri', discordConfig.redirectUri);
      
      const response = await fetch('https://discord.com/api/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Discord API error: ${response.status} - ${errorText}`);
      }
      
      return await response.json() as TokenResponse;
      
    } catch (error) {
      console.error('Error exchanging code for token:', error);
      return null;
    }
  }

  // Método auxiliar para buscar dados do usuário do Discord
  private async fetchDiscordUser(accessToken: string): Promise<DiscordUser | null> {
    try {
      const response = await fetch('https://discord.com/api/users/@me', {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Discord API error: ${response.status} - ${errorText}`);
      }
      
      return await response.json() as DiscordUser;
      
    } catch (error) {
      console.error('Error fetching Discord user:', error);
      return null;
    }
  }
}

export function setupDiscordAuth(fastify: FastifyInstance): void {

  const discordController = new DiscordOAuthController();
  
  // First register the middleware
  registerAuthMiddleware(fastify, {
    secret: process.env.JWT_SECRET || 'your-jwt-secret-key',
    skipRoutes: [
      '/auth/discord', 
      '/auth/discord/callback', 
      '/auth/logout'
    ]
  });
  
  // Then register the routes
  discordController.registerRoutes(fastify);
}