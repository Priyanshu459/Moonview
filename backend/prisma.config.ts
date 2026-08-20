// =============================================================================
// Moonview — Prisma Configuration File (Prisma 7)
// This file replaces the datasource `url` property removed in Prisma 7.
// It configures the database connection for ALL Prisma CLI commands:
//   prisma migrate dev/deploy/reset
//   prisma generate
//   prisma studio
//
// The DATABASE_URL environment variable is read from the shell environment.
// In development, ensure backend/.env is loaded (tsx --env-file=.env does this).
// =============================================================================

import { defineConfig, env } from 'prisma/config';
import fs from 'node:fs';

// Force load .env so Prisma CLI can find DATABASE_URL during config evaluation
if (fs.existsSync('.env')) {
  process.loadEnvFile('.env');
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: env('DATABASE_URL'),
  },
});
