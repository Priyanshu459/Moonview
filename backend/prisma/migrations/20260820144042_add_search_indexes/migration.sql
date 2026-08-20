-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- CreateIndex
CREATE INDEX "content_title_idx" ON "content" USING GIN ("title" gin_trgm_ops);
