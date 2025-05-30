import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import colors from 'colors';
import fp from 'fastify-plugin';

/**
 * Registers request, response and error logging hooks with the given Fastify instance.
 *
 * This function will log the following information to the console:
 *
 * - Incoming requests with method, URL and request ID
 * - Completed requests with method, URL, status code, response time and request ID
 * - Any errors that occur during the request with error message, URL, method and request ID
 */
export const LoggerService = fp(function (
  fastify: FastifyInstance,
  options: object,
  done: (err?: Error) => void
) {
  fastify.addHook('onRequest', (request: FastifyRequest, reply: FastifyReply, done) => {
    (request as any).startTime = process.hrtime();
    console.log(
      colors.bgBlue.black(' 📥 REQUEST ') +
      colors.blue(` [${request.method}] `) +
      colors.white(request.url)
    );
    request.log.info({ url: request.url, method: request.method }, 'Incoming request');
    done();
  });

  fastify.addHook('onResponse', (request: FastifyRequest, reply: FastifyReply, done) => {
    const startTime = (request as any).startTime as [number, number];
    const diff = process.hrtime(startTime);
    const responseTime = (diff[0] * 1e3) + (diff[1] / 1e6);
    let statusColor = colors.green;
    if (reply.statusCode >= 400) statusColor = colors.yellow;
    if (reply.statusCode >= 500) statusColor = colors.red;
    console.log(
      colors.bgGreen.black(' 📤 RESPONSE ') +
      colors.white(` ${request.method} `) +
      colors.cyan(request.url) +
      ' → ' +
      statusColor(` ${reply.statusCode} `) +
      colors.gray(` (${responseTime.toFixed(3)}ms) `)
    );
    request.log.info({
      statusCode: reply.statusCode,
      responseTime: `${responseTime.toFixed(3)}ms`,
    }, 'Request completed');
    
    done();
  });

  fastify.addHook('onError', (request: FastifyRequest, reply: FastifyReply, error, done) => {
    console.log(
      colors.bgRed.white(' ❌ ERROR ') +
      colors.red(` ${error.message} `) +
      colors.gray(` [${request.method} ${request.url}] `)
    );
    request.log.error({
      error: error.message,
      url: request.url,
      method: request.method,
    }, 'Request error');
    
    done();
  });

  done();
});
