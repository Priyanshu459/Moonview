import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const m = await prisma.mediaAsset.findFirst({ where: { status: "READY" } });
  console.log(m);
}

main().finally(() => prisma.$disconnect());
