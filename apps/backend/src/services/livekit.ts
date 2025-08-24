import { AccessToken } from "livekit-server-sdk";

const API_KEY = process.env.LIVEKIT_API_KEY!;
const API_SECRET = process.env.LIVEKIT_API_SECRET!;

export interface Metadata {
  isGuest: boolean;
  role: string;
}

export function createLivekitToken(
  room: string,
  userId: string,
  displayName: string,
  isGuest: boolean,
  role: string
) {
  const metadata: Metadata = { isGuest, role };

  const at = new AccessToken(API_KEY, API_SECRET, {
    identity: userId, // уникальный идентификатор
    name: displayName, // будет в participant.name
    metadata: JSON.stringify(metadata), // кастомные данные
  });

  at.addGrant({
    roomJoin: true,
    room,
  });

  return at.toJwt();
}
