import { prisma } from './src/config/database.js';
import * as argon2 from 'argon2';

async function main() {
  let admin = await prisma.admin.findFirst();
  if (!admin) {
    console.log("No admin found. Creating one...");
    const hash = await argon2.hash('admin12345');
    admin = await prisma.admin.create({
      data: {
        email: 'admin@moonview.com',
        name: 'Test Admin',
        passwordHash: hash
      }
    });
  } else {
    // Reset the password to 'admin12345'
    const hash = await argon2.hash('admin12345');
    await prisma.admin.update({
      where: { id: admin.id },
      data: { passwordHash: hash }
    });
    console.log("Admin password reset to 'admin12345'.");
  }
  console.log("Admin exists:", admin.email);
}

main().finally(() => process.exit(0));
