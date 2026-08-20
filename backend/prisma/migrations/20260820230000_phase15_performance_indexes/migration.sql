-- Remove indexes that duplicate unique constraints or a stronger composite index.
DROP INDEX IF EXISTS "admins_email_idx";
DROP INDEX IF EXISTS "genres_slug_idx";
DROP INDEX IF EXISTS "categories_slug_idx";
DROP INDEX IF EXISTS "content_slug_idx";
DROP INDEX IF EXISTS "content_featured_status_idx";
DROP INDEX IF EXISTS "seasons_seriesId_idx";
DROP INDEX IF EXISTS "episodes_seasonId_idx";
DROP INDEX IF EXISTS "media_assets_contentId_idx";
DROP INDEX IF EXISTS "media_assets_episodeId_idx";

-- Support the bounded, ordered queries used by Home and the admin lists.
CREATE INDEX "content_type_createdAt_idx" ON "content"("type", "createdAt" DESC);
CREATE INDEX "content_status_createdAt_idx" ON "content"("status", "createdAt" DESC);
CREATE INDEX "content_status_featured_createdAt_idx" ON "content"("status", "featured", "createdAt" DESC);
CREATE INDEX "content_status_type_updatedAt_idx" ON "content"("status", "type", "updatedAt" DESC);
CREATE INDEX "media_assets_createdAt_idx" ON "media_assets"("createdAt" DESC);

-- Continue Watching always filters by identity/completion and sorts by recency.
CREATE INDEX "watch_progress_userId_completed_updatedAt_idx"
  ON "watch_progress"("userId", "completed", "updatedAt" DESC);
CREATE INDEX "watch_progress_sessionId_completed_updatedAt_idx"
  ON "watch_progress"("sessionId", "completed", "updatedAt" DESC);
