import { JwtPayload } from 'jsonwebtoken';

export interface AuthTokenPayload extends JwtPayload {
  id: number;
  email: string;
  roleId: number;
  tokenVersion: number;
}
