import { prisma, connectDatabase, disconnectDatabase } from '../config/database.js';
import * as argon2 from 'argon2';
import { fileURLToPath } from 'node:url';

export function validateBootstrapPassword(password: string): string[] {
  const failures: string[] = [];
  if (password.length < 14) failures.push('at least 14 characters');
  if (!/[a-z]/.test(password)) failures.push('a lowercase letter');
  if (!/[A-Z]/.test(password)) failures.push('an uppercase letter');
  if (!/[0-9]/.test(password)) failures.push('a number');
  if (!/[^A-Za-z0-9]/.test(password)) failures.push('a symbol');
  return failures;
}

async function bootstrap() {
  await connectDatabase();

  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.error('Bootstrap failed: ADMIN_EMAIL or ADMIN_PASSWORD environment variables are missing.');
    console.error('Note: Set these environment variables only for the initial bootstrap and remove them afterwards.');
    process.exit(1);
  }

  try {
    const adminCount = await prisma.admin.count();

    if (adminCount > 0) {
      console.error('Bootstrap refused: one or more admin accounts already exist.');
      console.log('If you need to reset the password, use a dedicated reset script.');
      process.exit(1);
    }

    const passwordFailures = validateBootstrapPassword(password);
    if (passwordFailures.length > 0) {
      console.error(`Bootstrap failed: ADMIN_PASSWORD must include ${passwordFailures.join(', ')}.`);
      process.exit(1);
    }

    const passwordHash = await argon2.hash(password);

    await prisma.admin.create({
      data: {
        email,
        name: process.env.ADMIN_NAME || 'System Administrator',
        passwordHash,
      },
    });

    console.log(`Successfully bootstrapped admin account: ${email}`);
    console.log('IMPORTANT: Remove ADMIN_PASSWORD from the environment now.');
  } catch (error) {
    console.error('Failed to bootstrap admin account:', error);
    process.exit(1);
  } finally {
    await disconnectDatabase();
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  bootstrap();
}
