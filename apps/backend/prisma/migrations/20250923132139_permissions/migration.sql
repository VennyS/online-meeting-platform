-- CreateEnum
CREATE TYPE "public"."PermissionLevel" AS ENUM ('OWNER', 'ADMIN', 'ALL');

-- AlterTable
ALTER TABLE "public"."Room" ADD COLUMN     "canShareScreen" "public"."PermissionLevel" NOT NULL DEFAULT 'ALL',
ADD COLUMN     "canStartPresentation" "public"."PermissionLevel" NOT NULL DEFAULT 'ALL';
