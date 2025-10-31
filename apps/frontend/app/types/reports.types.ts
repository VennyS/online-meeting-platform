export interface MeetingReports {
  sessions: MeetingReport[];
}

export interface MeetingReport {
  id: number;
  roomId: number;
  startTime: string;
  endTime?: string;
  duration?: number;
  participants: Participant[];
}

export interface Participant {
  id: number;
  userId: number;
  name: string;
  sessions: ParticipantSession[];
}

export interface ParticipantSession {
  joinTime: string;
  leaveTime?: string;
}
