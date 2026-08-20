/*
  Warnings:

  - You are about to drop the `watch_progress` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "watch_progress" DROP CONSTRAINT "watch_progress_contentId_fkey";

-- DropForeignKey
ALTER TABLE "watch_progress" DROP CONSTRAINT "watch_progress_episodeId_fkey";

-- DropTable
DROP TABLE "watch_progress";
