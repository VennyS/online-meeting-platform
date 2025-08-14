import { AccessToken } from "livekit-server-sdk";

const API_KEY = process.env.LIVEKIT_API_KEY!;
const API_SECRET = process.env.LIVEKIT_API_SECRET!;

export function createLivekitToken(
  room: string,
  identity: string,
  isGuest: boolean = false
) {
  const at = new AccessToken(API_KEY, API_SECRET, {
    identity,
    metadata: isGuest ? "guest" : "user",
  });
  at.addGrant({
    roomJoin: true,
    room,
  });
  return at.toJwt();
}
