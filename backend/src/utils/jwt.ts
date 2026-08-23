import { SignJWT, jwtVerify } from 'jose';
import { config } from '../config.js';

const secretKey = new TextEncoder().encode(config.jwt.secret);

export interface JwtPayload {
  sub: string;
  username: string;
  role: string;
}

export async function signToken(payload: JwtPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(config.jwt.expiresIn)
    .sign(secretKey);
}

export async function verifyToken(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    return { sub: String(payload.sub), username: String(payload.username), role: String(payload.role) };
  } catch {
    return null;
  }
}
