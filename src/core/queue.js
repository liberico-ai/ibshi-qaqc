import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { createLogger } from './logger.js';

const log = createLogger('queue');
const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';

let connection = null;

export function getRedisConnection() {
  if (!connection) {
    connection = new IORedis(REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      lazyConnect: true,
    });
    connection.on('error', err => log.warn({ err }, 'Redis connection error — queues unavailable'));
  }
  return connection;
}

export function createQueue(name, opts = {}) {
  return new Queue(name, { connection: getRedisConnection(), ...opts });
}

export function createWorker(name, processor, opts = {}) {
  return new Worker(name, processor, {
    connection: getRedisConnection(),
    concurrency: opts.concurrency ?? 2,
    ...opts,
  });
}
