import { AccessToken } from "livekit-server-sdk";

const API_KEY = process.env.LIVEKIT_API_KEY!;
const API_SECRET = process.env.LIVEKIT_API_SECRET!;

export interface Metadata {
  isGuest: boolean;
  role: string;
}

export function createLivekitToken(
  room: string,
  identity: string,
  isGuest: boolean = false,
  role: string
) {
  const Metadata: Metadata = {
    isGuest,
    role,
  };

  const at = new AccessToken(API_KEY, API_SECRET, {
    identity,
    metadata: JSON.stringify(Metadata),
  });
  at.addGrant({
    roomJoin: true,
    room,
  });
  return at.toJwt();
}
