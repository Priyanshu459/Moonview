import { prisma } from './src/config/database.js';

async function main() {
  const count = await prisma.content.count();
  console.log('Content Count:', count);
}

main().finally(() => prisma.$disconnect());
