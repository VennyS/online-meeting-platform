import jwt, { JwtPayload } from "jsonwebtoken";

// Расширяем стандартный JwtPayload
export interface AuthTokenPayload extends JwtPayload {
  id: number;
  email: string;
  roleId: number;
  tokenVersion: number;
}

export function extractAuthToken(
  cookieHeader?: string
): { token: string; payload: AuthTokenPayload } | null {
  if (!cookieHeader) return null;

  const token = cookieHeader
    .split("; ")
    .find((c) => c.startsWith("auth-token="))
    ?.split("=")[1];

  if (!token) return null;

  try {
    const payload = jwt.decode(token) as AuthTokenPayload;
    return { token, payload };
  } catch (error) {
    console.error("Error decoding auth token:", error);
    return null;
  }
}
