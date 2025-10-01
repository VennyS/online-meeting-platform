import { AccessToken } from 'livekit-server-sdk';
import jwt, { JwtPayload } from 'jsonwebtoken';

export interface AuthTokenPayload extends JwtPayload {
  id: number;
  email: string;
  roleId: number;
  tokenVersion: number;
}

export function extractAuthToken(
  cookieHeader?: string,
): { token: string; payload: AuthTokenPayload } | null {
  if (!cookieHeader) return null;

  const token = cookieHeader
    .split('; ')
    .find((c) => c.startsWith('auth-token='))
    ?.split('=')[1];

  if (!token) return null;

  try {
    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET!,
    ) as AuthTokenPayload;

    return { token, payload };
  } catch (error) {
    console.error('Error verifying auth token:', error);
    return null;
  }
}

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
  role: string,
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

export function createEgressLivekitToken(roomShortId: string) {
  const at = new AccessToken(API_KEY, API_SECRET, {
    identity: 'egress',
    name: 'egress',
    metadata: JSON.stringify({
      isEgress: true,
    }),
  });

  at.addGrant({
    room: roomShortId,
    roomJoin: true,
    recorder: true,
    canPublish: false,
    canSubscribe: true,
    hidden: true,
  });

  return at.toJwt();
}
