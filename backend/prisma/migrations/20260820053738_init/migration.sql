-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('MOVIE', 'SERIES');

-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('DRAFT', 'PROCESSING', 'READY', 'PUBLISHED', 'UNPUBLISHED');

-- CreateEnum
CREATE TYPE "MaturityRating" AS ENUM ('G', 'PG', 'PG-13', 'R', 'NC-17', 'TV-Y', 'TV-G', 'TV-PG', 'TV-14', 'TV-MA');

-- CreateEnum
CREATE TYPE "ProcessingStatus" AS ENUM ('PENDING', 'PROCESSING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "UploadJobStatus" AS ENUM ('PENDING', 'UPLOADING', 'VALIDATING', 'PROCESSING', 'GENERATING_HLS', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "VideoCodec" AS ENUM ('H264', 'H265', 'VP9', 'AV1');

-- CreateEnum
CREATE TYPE "VideoResolution" AS ENUM ('2160p', '1080p', '720p', '480p', '360p');

-- CreateEnum
CREATE TYPE "SubtitleFormat" AS ENUM ('VTT', 'SRT', 'ASS');

-- CreateTable
CREATE TABLE "admins" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "genres" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,

    CONSTRAINT "genres_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "ContentType" NOT NULL,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "releaseYear" INTEGER NOT NULL,
    "duration" INTEGER,
    "maturityRating" "MaturityRating" NOT NULL DEFAULT 'PG-13',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "posterKey" TEXT,
    "backdropKey" TEXT,
    "trailerKey" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_genres" (
    "contentId" TEXT NOT NULL,
    "genreId" TEXT NOT NULL,

    CONSTRAINT "content_genres_pkey" PRIMARY KEY ("contentId","genreId")
);

-- CreateTable
CREATE TABLE "content_categories" (
    "contentId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "content_categories_pkey" PRIMARY KEY ("contentId","categoryId")
);

-- CreateTable
CREATE TABLE "seasons" (
    "id" TEXT NOT NULL,
    "seriesId" TEXT NOT NULL,
    "seasonNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "releaseYear" INTEGER,
    "posterKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "episodes" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "episodeNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "duration" INTEGER,
    "thumbnailKey" TEXT,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "episodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_assets" (
    "id" TEXT NOT NULL,
    "contentId" TEXT,
    "episodeId" TEXT,
    "originalFilename" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" BIGINT NOT NULL,
    "processingStatus" "ProcessingStatus" NOT NULL DEFAULT 'PENDING',
    "durationSeconds" DOUBLE PRECISION,
    "width" INTEGER,
    "height" INTEGER,
    "codec" TEXT,
    "bitrate" INTEGER,
    "frameRate" DOUBLE PRECISION,
    "hlsMasterKey" TEXT,
    "thumbnailKey" TEXT,
    "errorMessage" TEXT,
    "processingStartedAt" TIMESTAMP(3),
    "processingCompletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "video_variants" (
    "id" TEXT NOT NULL,
    "mediaAssetId" TEXT NOT NULL,
    "resolution" "VideoResolution" NOT NULL,
    "bitrate" INTEGER,
    "codec" "VideoCodec" NOT NULL DEFAULT 'H264',
    "manifestKey" TEXT,
    "mp4Key" TEXT,
    "fileSize" BIGINT,
    "width" INTEGER,
    "height" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "video_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subtitles" (
    "id" TEXT NOT NULL,
    "mediaAssetId" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "format" "SubtitleFormat" NOT NULL DEFAULT 'VTT',
    "storageKey" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isForced" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subtitles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upload_jobs" (
    "id" TEXT NOT NULL,
    "mediaAssetId" TEXT,
    "status" "UploadJobStatus" NOT NULL DEFAULT 'PENDING',
    "originalFilename" TEXT NOT NULL,
    "mimeType" TEXT,
    "fileSize" BIGINT,
    "bullJobId" TEXT,
    "uploadProgress" INTEGER NOT NULL DEFAULT 0,
    "processingProgress" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upload_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "watch_progress" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "episodeId" TEXT,
    "position" DOUBLE PRECISION NOT NULL,
    "duration" DOUBLE PRECISION NOT NULL,
    "percentage" DOUBLE PRECISION NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "watch_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "watch_history" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "episodeId" TEXT,
    "watchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "watch_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admins_email_key" ON "admins"("email");

-- CreateIndex
CREATE INDEX "admins_email_idx" ON "admins"("email");

-- CreateIndex
CREATE UNIQUE INDEX "genres_name_key" ON "genres"("name");

-- CreateIndex
CREATE UNIQUE INDEX "genres_slug_key" ON "genres"("slug");

-- CreateIndex
CREATE INDEX "genres_slug_idx" ON "genres"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE INDEX "categories_slug_idx" ON "categories"("slug");

-- CreateIndex
CREATE INDEX "categories_sortOrder_idx" ON "categories"("sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "content_slug_key" ON "content"("slug");

-- CreateIndex
CREATE INDEX "content_slug_idx" ON "content"("slug");

-- CreateIndex
CREATE INDEX "content_type_idx" ON "content"("type");

-- CreateIndex
CREATE INDEX "content_status_idx" ON "content"("status");

-- CreateIndex
CREATE INDEX "content_featured_idx" ON "content"("featured");

-- CreateIndex
CREATE INDEX "content_releaseYear_idx" ON "content"("releaseYear");

-- CreateIndex
CREATE INDEX "content_createdAt_idx" ON "content"("createdAt");

-- CreateIndex
CREATE INDEX "content_type_status_idx" ON "content"("type", "status");

-- CreateIndex
CREATE INDEX "content_featured_status_idx" ON "content"("featured", "status");

-- CreateIndex
CREATE INDEX "content_genres_genreId_idx" ON "content_genres"("genreId");

-- CreateIndex
CREATE INDEX "content_categories_categoryId_idx" ON "content_categories"("categoryId");

-- CreateIndex
CREATE INDEX "seasons_seriesId_idx" ON "seasons"("seriesId");

-- CreateIndex
CREATE UNIQUE INDEX "seasons_seriesId_seasonNumber_key" ON "seasons"("seriesId", "seasonNumber");

-- CreateIndex
CREATE INDEX "episodes_seasonId_idx" ON "episodes"("seasonId");

-- CreateIndex
CREATE INDEX "episodes_status_idx" ON "episodes"("status");

-- CreateIndex
CREATE UNIQUE INDEX "episodes_seasonId_episodeNumber_key" ON "episodes"("seasonId", "episodeNumber");

-- CreateIndex
CREATE UNIQUE INDEX "media_assets_contentId_key" ON "media_assets"("contentId");

-- CreateIndex
CREATE UNIQUE INDEX "media_assets_episodeId_key" ON "media_assets"("episodeId");

-- CreateIndex
CREATE UNIQUE INDEX "media_assets_storageKey_key" ON "media_assets"("storageKey");

-- CreateIndex
CREATE INDEX "media_assets_processingStatus_idx" ON "media_assets"("processingStatus");

-- CreateIndex
CREATE INDEX "media_assets_contentId_idx" ON "media_assets"("contentId");

-- CreateIndex
CREATE INDEX "media_assets_episodeId_idx" ON "media_assets"("episodeId");

-- CreateIndex
CREATE INDEX "video_variants_mediaAssetId_idx" ON "video_variants"("mediaAssetId");

-- CreateIndex
CREATE UNIQUE INDEX "video_variants_mediaAssetId_resolution_key" ON "video_variants"("mediaAssetId", "resolution");

-- CreateIndex
CREATE INDEX "subtitles_mediaAssetId_idx" ON "subtitles"("mediaAssetId");

-- CreateIndex
CREATE UNIQUE INDEX "subtitles_mediaAssetId_language_key" ON "subtitles"("mediaAssetId", "language");

-- CreateIndex
CREATE UNIQUE INDEX "upload_jobs_mediaAssetId_key" ON "upload_jobs"("mediaAssetId");

-- CreateIndex
CREATE INDEX "upload_jobs_status_idx" ON "upload_jobs"("status");

-- CreateIndex
CREATE INDEX "upload_jobs_createdAt_idx" ON "upload_jobs"("createdAt");

-- CreateIndex
CREATE INDEX "watch_progress_sessionId_idx" ON "watch_progress"("sessionId");

-- CreateIndex
CREATE INDEX "watch_progress_contentId_idx" ON "watch_progress"("contentId");

-- CreateIndex
CREATE INDEX "watch_progress_episodeId_idx" ON "watch_progress"("episodeId");

-- CreateIndex
CREATE INDEX "watch_progress_updatedAt_idx" ON "watch_progress"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "watch_progress_sessionId_contentId_episodeId_key" ON "watch_progress"("sessionId", "contentId", "episodeId");

-- CreateIndex
CREATE INDEX "watch_history_sessionId_idx" ON "watch_history"("sessionId");

-- CreateIndex
CREATE INDEX "watch_history_contentId_idx" ON "watch_history"("contentId");

-- CreateIndex
CREATE INDEX "watch_history_watchedAt_idx" ON "watch_history"("watchedAt");

-- AddForeignKey
ALTER TABLE "content_genres" ADD CONSTRAINT "content_genres_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_genres" ADD CONSTRAINT "content_genres_genreId_fkey" FOREIGN KEY ("genreId") REFERENCES "genres"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_categories" ADD CONSTRAINT "content_categories_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_categories" ADD CONSTRAINT "content_categories_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seasons" ADD CONSTRAINT "seasons_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "episodes" ADD CONSTRAINT "episodes_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "episodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_variants" ADD CONSTRAINT "video_variants_mediaAssetId_fkey" FOREIGN KEY ("mediaAssetId") REFERENCES "media_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subtitles" ADD CONSTRAINT "subtitles_mediaAssetId_fkey" FOREIGN KEY ("mediaAssetId") REFERENCES "media_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upload_jobs" ADD CONSTRAINT "upload_jobs_mediaAssetId_fkey" FOREIGN KEY ("mediaAssetId") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watch_progress" ADD CONSTRAINT "watch_progress_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watch_progress" ADD CONSTRAINT "watch_progress_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "episodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watch_history" ADD CONSTRAINT "watch_history_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watch_history" ADD CONSTRAINT "watch_history_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "episodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
