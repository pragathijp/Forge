import { createClient } from 'redis';
import { env } from './env';

export const redisClient = createClient({ url: env.REDIS_URL });

redisClient.on('error', (err) => {
  console.error('Redis client error:', err);
});

let connected = false;

export async function connectRedis() {
  if (!connected) {
    await redisClient.connect();
    connected = true;
  }
}