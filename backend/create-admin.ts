import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';

async function main() {
  const prisma = new PrismaClient();
  const email = 'admin_proc_test@example.com';
  const password = 'admin12345';
  const hash = await argon2.hash(password);
  
  await prisma.admin.upsert({
    where: { email },
    update: { passwordHash: hash },
    create: { name: 'E2E Admin', email, passwordHash: hash }
  });
  console.log('Admin created/updated!');
  await prisma.$disconnect();
}
main();
