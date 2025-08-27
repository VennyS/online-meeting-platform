/*
  Warnings:

  - Added the required column `name` to the `Room` table without a default value. This is not possible if the table is not empty.
  - Added the required column `startAt` to the `Room` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Room" ADD COLUMN     "allowEarlyJoin" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "durationMinutes" INTEGER,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "startAt" TIMESTAMP(3) NOT NULL;
