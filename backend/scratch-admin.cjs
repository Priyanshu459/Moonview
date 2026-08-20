const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

async function main() {
  const prisma = new PrismaClient();
  const email = 'admin_proc_test@example.com';
  const password = 'adminpassword123';
  const hash = await bcrypt.hash(password, 10);
  
  await prisma.admin.upsert({
    where: { email },
    update: { password: hash },
    create: { name: 'E2E Admin', email, password: hash }
  });
  console.log('Admin created/updated!');
  await prisma.$disconnect();
}
main();
