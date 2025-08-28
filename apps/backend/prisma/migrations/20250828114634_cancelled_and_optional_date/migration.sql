-- AlterTable
ALTER TABLE "public"."Room" ADD COLUMN     "cancelled" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "startAt" DROP NOT NULL;
