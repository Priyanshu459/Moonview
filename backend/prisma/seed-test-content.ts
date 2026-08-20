import { PrismaClient, ContentType, ContentStatus, ProcessingStatus, MaturityRating } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env['DATABASE_URL'] });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Starting test content seed...\n');

  // Check if test content exists
  const existingMovie = await prisma.content.findUnique({ where: { slug: 'moonview-test-movie' } });
  
  if (existingMovie) {
    console.log('ℹ️  Test content already exists. Skipping.');
    return;
  }

  // Create Movie
  const movie = await prisma.content.create({
    data: {
      title: 'Moonview Test Movie',
      slug: 'moonview-test-movie',
      description: 'A test movie to verify playback, progress, and continue watching.',
      type: ContentType.MOVIE,
      status: ContentStatus.PUBLISHED,
      releaseYear: 2026,
      duration: 3600,
      maturityRating: MaturityRating.PG_13,
      posterKey: null,
      backdropKey: null,
      mediaAsset: {
        create: {
          originalFilename: 'test_movie.mp4',
          storageKey: 'test_movie.mp4',
          mimeType: 'video/mp4',
          fileSize: 1024000,
          processingStatus: ProcessingStatus.READY,
          durationSeconds: 3600,
        }
      }
    }
  });
  console.log(`✅ Created test movie: ${movie.title}`);

  // Create Series
  const series = await prisma.content.create({
    data: {
      title: 'Moonview Test Series',
      slug: 'moonview-test-series',
      description: 'A test series for testing episode playback and progress.',
      type: ContentType.SERIES,
      status: ContentStatus.PUBLISHED,
      releaseYear: 2026,
      maturityRating: MaturityRating.TV_14,
      seasons: {
        create: [
          {
            seasonNumber: 1,
            title: 'Season 1',
            episodes: {
              create: [
                {
                  episodeNumber: 1,
                  title: 'Moonview Test Episode 1',
                  duration: 1800,
                  status: ContentStatus.PUBLISHED,
                  mediaAsset: {
                    create: {
                      originalFilename: 'test_episode_1.mp4',
                      storageKey: 'test_episode_1.mp4',
                      mimeType: 'video/mp4',
                      fileSize: 512000,
                      processingStatus: ProcessingStatus.READY,
                      durationSeconds: 1800,
                    }
                  }
                },
                {
                  episodeNumber: 2,
                  title: 'Moonview Test Episode 2',
                  duration: 1800,
                  status: ContentStatus.PUBLISHED,
                  mediaAsset: {
                    create: {
                      originalFilename: 'test_episode_2.mp4',
                      storageKey: 'test_episode_2.mp4',
                      mimeType: 'video/mp4',
                      fileSize: 512000,
                      processingStatus: ProcessingStatus.READY,
                      durationSeconds: 1800,
                    }
                  }
                }
              ]
            }
          }
        ]
      }
    }
  });

  console.log(`✅ Created test series: ${series.title}`);

  console.log('\n✅ Test content seed complete.\n');
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
