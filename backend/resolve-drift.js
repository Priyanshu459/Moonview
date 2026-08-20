import pg from 'pg';

const pool = new pg.Pool({ connectionString: 'postgresql://moonview_user:priyanshu123@localhost:5432/moonview_dev?schema=public' });

async function main() {
  await pool.query('ALTER TABLE "watch_progress" DROP CONSTRAINT "watch_progress_mediaAssetId_fkey";');
  await pool.query('DROP INDEX "watch_progress_sessionId_mediaAssetId_key";');
  await pool.query('ALTER TABLE "watch_progress" DROP COLUMN "mediaAssetId";');
  await pool.query('CREATE UNIQUE INDEX "watch_progress_sessionId_contentId_episodeId_key" ON "watch_progress"("sessionId", "contentId", "episodeId");');
  console.log('Reverted schema manually to resolve drift.');
}

main().finally(() => pool.end());
