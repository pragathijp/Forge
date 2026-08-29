import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';


// DATABASE_URL is loaded from the root .env file (Prisma's convention),
// separate from our own .env.development — see src/config/env.ts for app config.

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

export const prisma = new PrismaClient({ adapter });