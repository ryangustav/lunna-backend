import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import chalk from 'chalk';
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
      chalk.bgBlue.black(` 📥 REQUEST `) +
      chalk.blue(` [${request.method}] `) +
      chalk.white(request.url)
    );
    request.log.info({ url: request.url, method: request.method }, 'Incoming request');
    done();
  });

  fastify.addHook('onResponse', (request: FastifyRequest, reply: FastifyReply, done) => {
    const startTime = (request as any).startTime as [number, number];
    const diff = process.hrtime(startTime);
    const responseTime = (diff[0] * 1e3) + (diff[1] / 1e6);
    let statusColor = chalk.green;
    if (reply.statusCode >= 400) statusColor = chalk.yellow;
    if (reply.statusCode >= 500) statusColor = chalk.red;
    console.log(
      chalk.bgGreen.black(` 📤 RESPONSE `) +
      chalk.white(` ${request.method} `) +
      chalk.cyan(request.url) +
      ` → ` +
      statusColor(` ${reply.statusCode} `) +
      chalk.gray(` (${responseTime.toFixed(3)}ms) `)
    );
    request.log.info({
      statusCode: reply.statusCode,
      responseTime: `${responseTime.toFixed(3)}ms`,
    }, 'Request completed');
    
    done();
  });

  fastify.addHook('onError', (request: FastifyRequest, reply: FastifyReply, error, done) => {
    console.log(
      chalk.bgRed.white(` ❌ ERROR `) +
      chalk.red(` ${error.message} `) +
      chalk.gray(` [${request.method} ${request.url}] `)
    );
    request.log.error({
      error: error.message,
      url: request.url,
      method: request.method,
    }, 'Request error');
    
    done();
  });

  // Signal plugin registration is complete
  done();
});
