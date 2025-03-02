import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import rateLimit from '@fastify/rate-limit';
import helmet from '@fastify/helmet';
import { Redis } from 'ioredis';
import { FastifyRequest, FastifyReply } from 'fastify';

interface SecurityOptions {
  rateLimiting?: {
    enabled: boolean;
    max: number;
    timeWindow: string;
    routeSpecificLimits?: {
      [route: string]: {
        max: number;
        timeWindow: string;
      };
    };
  };
  helmet?: {
    enabled: boolean;
    contentSecurityPolicy?: boolean;
  };
  botProtection?: {
    enabled: boolean;
    blockSuspiciousBots?: boolean;
  };
  redisUrl?: string;
}


const securityPlugin: FastifyPluginAsync<SecurityOptions> = async (fastify: FastifyInstance, options: SecurityOptions) => {
  const {
    rateLimiting = { enabled: true, max: 100, timeWindow: '1 minute' },
    helmet = { enabled: true, contentSecurityPolicy: true },
    botProtection = { enabled: true, blockSuspiciousBots: false },
    redisUrl = process.env.REDIS_URL
  } = options;


  let redis: Redis | undefined;
  if (redisUrl) {
    try {
      redis = new Redis(redisUrl);
      fastify.log.info('Redis connection established for security features');
    } catch (error) {
      fastify.log.warn('Failed to connect to Redis, falling back to in-memory store');
    }
  }


  if (helmet.enabled) {
    await fastify.register(import('@fastify/helmet'), {
      contentSecurityPolicy: helmet.contentSecurityPolicy ? {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "js.stripe.com"],
          frameSrc: ["'self'", "hooks.stripe.com"],
          connectSrc: ["'self'", "api.stripe.com", "discord.com"],
          imgSrc: ["'self'", "cdn.discordapp.com", "data:"],
        }
      } : false
    });
  }

  if (rateLimiting.enabled) {
    await fastify.register(rateLimit, {
      max: rateLimiting.max,
      timeWindow: rateLimiting.timeWindow,
      redis,
      keyGenerator: (request) => {

        const clientIp = request.headers['x-forwarded-for'] || request.ip;
        const userAgent = request.headers['user-agent'] || 'unknown';
        return `${clientIp}-${userAgent}`;
      },
      errorResponseBuilder: (request, context) => {
        fastify.log.warn({
          ip: request.ip,
          path: request.url,
          exceededLimit: true
        }, 'Rate limit exceeded');
        
        return {
          statusCode: 429,
          error: 'Too Many Requests',
          message: `Demasiadas requisições. Por favor, tente novamente em ${context.after}.`
        };
      }
    });

    if (rateLimiting.routeSpecificLimits) {
      for (const [route, limits] of Object.entries(rateLimiting.routeSpecificLimits)) {
        fastify.route({
          url: route,
          method: ['GET', 'POST', 'PUT', 'DELETE'],
          config: {
            rateLimit: {
              max: limits.max,
              timeWindow: limits.timeWindow
            }
          },
          handler: (_, reply) => reply.send() 
        });
      }
    }
  }


  if (botProtection.enabled) {
    fastify.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
      const userAgent = request.headers['user-agent'] || '';
      
 
      const suspiciousBotPatterns = [
        /[Cc]rawl/, /[Ss]crape/, /[Ss]pider/, 
        /[Bb]ot(?!fox)/, 
        /puppeteer/, /selenium/, /headless/,
        /PhantomJS/, /Lighthouse/, /axios/, /curl/, /wget/
      ];
      

      const legitimateBotPatterns = [
        /googlebot/i, /bingbot/i, /yandexbot/i, 
        /twitterbot/i, /facebookexternalhit/i
      ];
      
      const isSuspicious = suspiciousBotPatterns.some(pattern => 
        pattern.test(userAgent) && 
        !legitimateBotPatterns.some(legit => legit.test(userAgent))
      );
      
      if (isSuspicious) {
        fastify.log.info({
          ip: request.ip,
          userAgent,
          path: request.url
        }, 'Suspicious bot activity detected');
        
        if (botProtection.blockSuspiciousBots) {
          return reply.code(403).send({ 
            error: 'Acesso negado. entre em contato com o suporte.' 
          });
        } else {

          await new Promise(resolve => setTimeout(resolve, 1500));
        }
      }
    });
  }


  fastify.addHook('preValidation', (request: FastifyRequest, _reply, done) => {
    if (request.query) {
      Object.keys(request.query).forEach(key => {
        const value = (request.query as any)[key];
        if (typeof value === 'string') {
          (request.query as any)[key] = sanitizeString(value);
        }
      });
    }

    if (request.body && typeof request.body === 'object' && !Buffer.isBuffer(request.body)) {
      sanitizeObject(request.body);
    }
    
    done();
  });


  fastify.addHook('onSend', (_request, reply, _payload, done) => {
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('X-Frame-Options', 'DENY');
    reply.header('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
    done();
  });

 
  function sanitizeString(str: string): string {
  
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  function sanitizeObject(obj: any): void {
    if (!obj || typeof obj !== 'object') return;
    
    Object.keys(obj).forEach(key => {
      const value = obj[key];
      if (typeof value === 'string') {
        obj[key] = sanitizeString(value);
      } else if (typeof value === 'object' && value !== null) {
        sanitizeObject(value);
      }
    });
  }
};

export default fp(securityPlugin, {
  name: 'security-plugin',
  fastify: '5.x'
});