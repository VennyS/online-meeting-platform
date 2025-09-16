-- CreateEnum
CREATE TYPE "public"."FileType" AS ENUM ('VIDEO', 'AUDIO', 'TEXT', 'PDF');

-- CreateTable
CREATE TABLE "public"."File" (
    "id" SERIAL NOT NULL,
    "roomId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "fileKey" TEXT NOT NULL,
    "fileType" "public"."FileType" NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "File_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "File_roomId_idx" ON "public"."File"("roomId");

-- CreateIndex
CREATE INDEX "File_userId_idx" ON "public"."File"("userId");

-- AddForeignKey
ALTER TABLE "public"."File" ADD CONSTRAINT "File_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "public"."Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;
