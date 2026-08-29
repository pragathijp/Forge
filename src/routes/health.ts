import { Router } from 'express';
import { prisma } from '../config/prisma';
import { createClient } from 'redis';

const router = Router();

router.get('/health', async (req, res) => {
  const checks = { postgres: 'DOWN', redis: 'DOWN' };

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.postgres = 'UP';
  } catch {}

  try {
    const client = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
    await client.connect();
    await client.ping();
    await client.disconnect();
    checks.redis = 'UP';
  } catch {}

  const allUp = checks.postgres === 'UP' && checks.redis === 'UP';
  res.status(allUp ? 200 : 503).json({ status: allUp ? 'UP' : 'DOWN', checks });
});

export default router;