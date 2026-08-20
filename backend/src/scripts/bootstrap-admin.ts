import { prisma, connectDatabase, disconnectDatabase } from '../config/database.js';
import * as argon2 from 'argon2';

async function bootstrap() {
  await connectDatabase();

  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD_SEED;

  if (!email || !password) {
    console.error('❌ Bootstrap failed: ADMIN_EMAIL or ADMIN_PASSWORD_SEED environment variables are missing.');
    console.error('Note: Set these environment variables only for the initial bootstrap and remove them afterwards.');
    process.exit(1);
  }

  try {
    const existingAdmin = await prisma.admin.findUnique({
      where: { email },
    });

    if (existingAdmin) {
      console.log('✅ Admin account already exists. Skipping bootstrap.');
      console.log('If you need to reset the password, use a dedicated reset script.');
      process.exit(0);
    }

    const passwordHash = await argon2.hash(password);

    await prisma.admin.create({
      data: {
        email,
        name: process.env.ADMIN_NAME || 'System Administrator',
        passwordHash,
      },
    });

    console.log(`✅ Successfully bootstrapped admin account: ${email}`);
    console.log('⚠️ IMPORTANT: Please remove ADMIN_PASSWORD_SEED from your environment variables now.');
  } catch (error) {
    console.error('❌ Failed to bootstrap admin account:', error);
    process.exit(1);
  } finally {
    await disconnectDatabase();
  }
}

bootstrap();
