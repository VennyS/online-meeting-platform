-- AlterTable
ALTER TABLE "public"."Room" ADD COLUMN     "passwordHash" TEXT,
ADD COLUMN     "waitingRoomEnabled" BOOLEAN NOT NULL DEFAULT false;
