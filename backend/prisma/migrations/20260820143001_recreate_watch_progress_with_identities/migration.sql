-- CreateTable
CREATE TABLE "watch_progress" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "sessionId" TEXT,
    "contentId" TEXT NOT NULL,
    "episodeId" TEXT,
    "mediaAssetId" TEXT NOT NULL,
    "position" DOUBLE PRECISION NOT NULL,
    "duration" DOUBLE PRECISION NOT NULL,
    "percentage" DOUBLE PRECISION NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "watch_progress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "watch_progress_userId_idx" ON "watch_progress"("userId");

-- CreateIndex
CREATE INDEX "watch_progress_sessionId_idx" ON "watch_progress"("sessionId");

-- CreateIndex
CREATE INDEX "watch_progress_contentId_idx" ON "watch_progress"("contentId");

-- CreateIndex
CREATE INDEX "watch_progress_episodeId_idx" ON "watch_progress"("episodeId");

-- CreateIndex
CREATE INDEX "watch_progress_updatedAt_idx" ON "watch_progress"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "watch_progress_userId_mediaAssetId_key" ON "watch_progress"("userId", "mediaAssetId");

-- CreateIndex
CREATE UNIQUE INDEX "watch_progress_sessionId_mediaAssetId_key" ON "watch_progress"("sessionId", "mediaAssetId");

-- AddForeignKey
ALTER TABLE "watch_progress" ADD CONSTRAINT "watch_progress_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watch_progress" ADD CONSTRAINT "watch_progress_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "episodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watch_progress" ADD CONSTRAINT "watch_progress_mediaAssetId_fkey" FOREIGN KEY ("mediaAssetId") REFERENCES "media_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
