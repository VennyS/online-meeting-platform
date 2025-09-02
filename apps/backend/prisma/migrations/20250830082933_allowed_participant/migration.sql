-- CreateTable
CREATE TABLE "public"."AllowedParticipant" (
    "id" SERIAL NOT NULL,
    "roomId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AllowedParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AllowedParticipant_roomId_userId_key" ON "public"."AllowedParticipant"("roomId", "userId");

-- AddForeignKey
ALTER TABLE "public"."AllowedParticipant" ADD CONSTRAINT "AllowedParticipant_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "public"."Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;
