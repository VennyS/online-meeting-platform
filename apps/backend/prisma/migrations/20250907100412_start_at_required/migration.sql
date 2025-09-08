/*
  Warnings:

  - Made the column `startAt` on table `Room` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "public"."Room" ALTER COLUMN "startAt" SET NOT NULL,
ALTER COLUMN "startAt" SET DEFAULT CURRENT_TIMESTAMP;
