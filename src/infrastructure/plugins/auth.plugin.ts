import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import * as jwt from 'jsonwebtoken';
import fp from 'fastify-plugin';

interface AuthOptions {
  secret: string;
  skipRoutes?: string[];
}

export interface AuthPayload {
  userId: string;
  avatar: string | null;
  username: string;
}

const authPlugin = fp(async (fastify: FastifyInstance, options: AuthOptions) => {
  const { secret, skipRoutes = [] } = options;

  fastify.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    const pathWithoutQuery = request.url.split('?')[0];
    
   
    const isImageFile = /\.(png|jpg|jpeg|gif|svg|webp)$/i.test(pathWithoutQuery);
    

    if (skipRoutes.includes(pathWithoutQuery) || isImageFile) {
      return;
    } else {
   
      const hasPatternMatch = skipRoutes.some(route => {
  
        if (route.includes(':')) {
          const routeParts = route.split('/').filter(Boolean);
          const pathParts = pathWithoutQuery.split('/').filter(Boolean);
          
      
          if (routeParts.length !== pathParts.length) return false;
          
       
          for (let i = 0; i < routeParts.length; i++) {
      
            if (routeParts[i].startsWith(':')) continue;
    
            if (routeParts[i] !== pathParts[i]) return false;
          }
          
          return true;
        }
        return false;
      });
      
      if (hasPatternMatch) {
        return;
      }

      const authHeader = request.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.log(`❌ Token not provided`);
        return reply.status(401).send({
          success: false,
          error: 'Unauthorized - Token not provided',
        });
      }
    
      const token = authHeader.split(' ')[1];

      try {
        const payload = jwt.verify(token, secret) as AuthPayload;
        (request as any).user = payload;
      } catch (error) {
        return reply.status(401).send({
          success: false,
          error: 'Unauthorized - Invalid token',
        });
      }
    }
  });

  fastify.decorateRequest('requireAuth', function(this: FastifyRequest & { user?: AuthPayload }, reply: FastifyReply) {
    if (!this.user) {
      reply.status(401).send({
        success: false,
        error: 'Unauthorized - Authentication required'
      });
      return false;
    }
    return true;
  });
  
  fastify.decorateRequest('isResourceOwner', function(this: FastifyRequest & { user?: AuthPayload }, resourceUserId: string) {
    return this.user && this.user.userId === resourceUserId;
  });
});

export default authPlugin;