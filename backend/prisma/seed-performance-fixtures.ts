import { prisma, disconnectDatabase } from '../src/config/database.js';

const PREFIX = 'phase15-fixture-';

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Performance fixtures are forbidden in production');
  }

  const action = process.argv[2] ?? 'up';
  if (action === 'down') {
    const result = await prisma.content.deleteMany({ where: { slug: { startsWith: PREFIX } } });
    console.log(`Removed ${result.count} Phase 15 fixtures`);
    return;
  }
  if (action !== 'up') throw new Error('Usage: npm run fixtures:performance -- up|down');

  const rows = Array.from({ length: 120 }, (_, index) => ({
    title: `Phase 15 Fixture ${String(index + 1).padStart(3, '0')}`,
    slug: `${PREFIX}${String(index + 1).padStart(3, '0')}`,
    description: 'Temporary development-only record for bounded list and search verification.',
    type: index % 5 === 0 ? 'SERIES' as const : 'MOVIE' as const,
    status: 'PUBLISHED' as const,
    releaseYear: 2026,
    maturityRating: 'PG_13' as const,
    featured: index < 3,
  }));

  const result = await prisma.content.createMany({ data: rows, skipDuplicates: true });
  console.log(`Created ${result.count} Phase 15 fixtures`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(disconnectDatabase);
