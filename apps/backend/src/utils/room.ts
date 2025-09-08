export function isMeetingFinished(room: {
  startAt: Date;
  durationMinutes?: number;
  numParticipants: number;
  gracePeriod?: number;
}) {
  if (room.numParticipants > 0) return false;

  const startMs = room.startAt.getTime();
  const endMs = room.durationMinutes
    ? startMs + room.durationMinutes * 60_000
    : startMs;

  return Date.now() > endMs + (room.gracePeriod ?? 5 * 60_000);
}
