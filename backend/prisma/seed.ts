// =============================================================================
// Moonview — Database Seed Script
// Creates the initial admin user and seed taxonomy data.
// Run with: npm run db:seed (from workspace root) or npm run db:seed (from backend/)
//
// IMPORTANT: This script reads admin credentials from environment variables.
// Never hardcode credentials here.
// =============================================================================

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import argon2 from 'argon2';

// Prisma 7 requires a driver adapter — use pg Pool + PrismaPg
const pool = new Pool({ connectionString: process.env['DATABASE_URL'] });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ---------------------------------------------------------------------------
// Seed genres
// ---------------------------------------------------------------------------

const SEED_GENRES = [
  { name: 'Action', slug: 'action' },
  { name: 'Adventure', slug: 'adventure' },
  { name: 'Animation', slug: 'animation' },
  { name: 'Comedy', slug: 'comedy' },
  { name: 'Crime', slug: 'crime' },
  { name: 'Documentary', slug: 'documentary' },
  { name: 'Drama', slug: 'drama' },
  { name: 'Fantasy', slug: 'fantasy' },
  { name: 'Horror', slug: 'horror' },
  { name: 'Mystery', slug: 'mystery' },
  { name: 'Romance', slug: 'romance' },
  { name: 'Science Fiction', slug: 'sci-fi' },
  { name: 'Thriller', slug: 'thriller' },
  { name: 'Western', slug: 'western' },
];

// ---------------------------------------------------------------------------
// Seed categories
// ---------------------------------------------------------------------------

const SEED_CATEGORIES = [
  { name: 'Trending Now', slug: 'trending', description: 'Most watched content right now', sortOrder: 1 },
  { name: 'Popular', slug: 'popular', description: 'Most popular content', sortOrder: 2 },
  { name: 'New Releases', slug: 'new-releases', description: 'Recently added content', sortOrder: 3 },
  { name: 'Featured', slug: 'featured', description: 'Editor curated picks', sortOrder: 4 },
  { name: 'Continue Watching', slug: 'continue-watching', description: 'Resume where you left off', sortOrder: 5 },
  { name: 'Recommended', slug: 'recommended', description: 'Recommended for you', sortOrder: 6 },
  { name: 'Recently Added', slug: 'recently-added', description: 'Latest additions to the library', sortOrder: 7 },
];

// ---------------------------------------------------------------------------
// Main seed function
// ---------------------------------------------------------------------------

async function main() {
  console.log('🌱 Starting database seed...\n');

  // ---- Admin user ----
  const adminEmail = process.env['ADMIN_EMAIL'];
  const adminPassword = process.env['ADMIN_PASSWORD'];
  const adminName = process.env['ADMIN_NAME'] ?? 'Administrator';

  if (!adminEmail || !adminPassword) {
    console.warn(
      '⚠️  ADMIN_EMAIL and ADMIN_PASSWORD not set in environment.\n' +
      '   Skipping admin user creation.\n' +
      '   Set these in backend/.env and re-run the seed to create the admin user.',
    );
  } else {
    const existingAdmin = await prisma.admin.findUnique({ where: { email: adminEmail } });

    if (existingAdmin) {
      console.log(`ℹ️  Admin user '${adminEmail}' already exists — skipping creation.`);
    } else {
      // Argon2id is the recommended variant (memory-hard, resistant to side-channel attacks)
      const passwordHash = await argon2.hash(adminPassword, {
        type: argon2.argon2id,
        memoryCost: 65536, // 64 MB
        timeCost: 3,
        parallelism: 4,
      });

      await prisma.admin.create({
        data: {
          email: adminEmail,
          name: adminName,
          passwordHash,
        },
      });

      console.log(`✅ Admin user created: ${adminEmail}`);
      console.log('   ⚠️  You can now remove ADMIN_PASSWORD from your .env file.');
    }
  }

  // ---- Genres ----
  console.log('\n📂 Seeding genres...');
  let genresCreated = 0;
  for (const genre of SEED_GENRES) {
    await prisma.genre.upsert({
      where: { slug: genre.slug },
      update: { name: genre.name },
      create: genre,
    });
    genresCreated++;
  }
  console.log(`✅ ${genresCreated} genres seeded`);

  // ---- Categories ----
  console.log('\n📂 Seeding categories...');
  let categoriesCreated = 0;
  for (const category of SEED_CATEGORIES) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: { name: category.name, description: category.description, sortOrder: category.sortOrder },
      create: category,
    });
    categoriesCreated++;
  }
  console.log(`✅ ${categoriesCreated} categories seeded`);

  console.log('\n✅ Seed complete.\n');
}

main()
  .catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
