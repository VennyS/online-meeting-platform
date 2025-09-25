-- CreateTable
CREATE TABLE "public"."MeetingSession" (
    "id" SERIAL NOT NULL,
    "roomId" INTEGER NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" TIMESTAMP(3),
    "duration" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MeetingSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Participant" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Participant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ParticipantSession" (
    "id" SERIAL NOT NULL,
    "participantId" INTEGER NOT NULL,
    "meetingSessionId" INTEGER NOT NULL,
    "joinTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leaveTime" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParticipantSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."_MeetingSessionToParticipant" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_MeetingSessionToParticipant_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "MeetingSession_roomId_idx" ON "public"."MeetingSession"("roomId");

-- CreateIndex
CREATE UNIQUE INDEX "Participant_userId_key" ON "public"."Participant"("userId");

-- CreateIndex
CREATE INDEX "Participant_userId_idx" ON "public"."Participant"("userId");

-- CreateIndex
CREATE INDEX "ParticipantSession_participantId_idx" ON "public"."ParticipantSession"("participantId");

-- CreateIndex
CREATE INDEX "ParticipantSession_meetingSessionId_idx" ON "public"."ParticipantSession"("meetingSessionId");

-- CreateIndex
CREATE INDEX "_MeetingSessionToParticipant_B_index" ON "public"."_MeetingSessionToParticipant"("B");

-- AddForeignKey
ALTER TABLE "public"."MeetingSession" ADD CONSTRAINT "MeetingSession_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "public"."Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ParticipantSession" ADD CONSTRAINT "ParticipantSession_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "public"."Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_MeetingSessionToParticipant" ADD CONSTRAINT "_MeetingSessionToParticipant_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."MeetingSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_MeetingSessionToParticipant" ADD CONSTRAINT "_MeetingSessionToParticipant_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
