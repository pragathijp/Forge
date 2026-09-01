import { RequestHandler } from 'express';
import { redisClient } from '../config/redis';

const TTL_SECONDS = 60 * 60 * 24; // 24 hours

export const idempotency: RequestHandler = (req, res, next) => {
  const idempotencyKey = req.header('Idempotency-Key');

  if (!idempotencyKey) {
    return next();
  }

  const organizationId = req.user?.organizationId;
  const cacheKey = `idempotency:${organizationId}:${req.method}:${req.originalUrl}:${idempotencyKey}`;

  redisClient
    .get(cacheKey)
    .then((cached) => {
      if (cached) {
        const { status, body } = JSON.parse(cached);
        return res.status(status).json(body);
      }

      const originalJson = res.json.bind(res);
      res.json = (body: unknown) => {
        redisClient
          .set(cacheKey, JSON.stringify({ status: res.statusCode, body }), { EX: TTL_SECONDS })
          .catch((err) => console.error('Failed to cache idempotent response:', err));
        return originalJson(body);
      };

      next();
    })
    .catch((err) => {
      console.error('Idempotency middleware Redis error:', err);
      next();
    });
};