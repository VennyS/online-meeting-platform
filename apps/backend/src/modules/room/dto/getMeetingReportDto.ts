export interface ParticipantSessionDto {
  joinTime: string;
  leaveTime?: string;
}

export interface ParticipantDto {
  id: number;
  userId: number;
  name: string;
  sessions: ParticipantSessionDto[];
}

export interface MeetingReportDto {
  id: number;
  roomId: number;
  startTime: string;
  endTime?: string;
  duration?: number;
  participants: ParticipantDto[];
}

export interface GetMeetingReportsDto {
  sessions: MeetingReportDto[];
}
