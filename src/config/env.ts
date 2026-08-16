import dotenv from 'dotenv';
import { z } from 'zod';

// Load the right .env file based on NODE_ENV — defaults to development
dotenv.config({ path: `.env.${process.env.NODE_ENV || 'development'}` });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(8080),
});

// This throws immediately if validation fails — that's the "fail fast" behavior we want.
const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.format());
  throw new Error('Invalid environment variables — see errors above.');
}

export const env = parsed.data;