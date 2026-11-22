import crypto from 'node:crypto';
import type { ClientBotConfig } from '../shared/types.ts';

function getSigningSecret(): string {
  const secret = process.env.SESSION_SECRET?.trim();
  if (!secret || secret.length < 32) {
    throw new Error('SESSION_SECRET must be configured with at least 32 characters.');
  }
  return secret;
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, originalHex] = parts;
  if (!salt || !originalHex) return false;
  const derivedBuf = crypto.scryptSync(password, salt, 64);
  const originalBuf = Buffer.from(originalHex, 'hex');
  return (
    derivedBuf.length === originalBuf.length &&
    crypto.timingSafeEqual(derivedBuf, originalBuf)
  );
}

export interface ClientSessionPayload {
  clientId: string;
  userId: string;
  exp: number;
}

export function signClientToken(clientId: string, userId: string): string {
  const payload: ClientSessionPayload = {
    clientId,
    userId,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
  };
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto
    .createHmac('sha256', getSigningSecret())
    .update(encoded)
    .digest('base64url');
  return `${encoded}.${sig}`;
}

export function verifyClientToken(token: string): ClientSessionPayload | null {
  if (!token || !token.includes('.')) return null;
  const [encoded, sig] = token.split('.');
  if (!encoded || !sig) return null;

  const expectedSig = crypto
    .createHmac('sha256', getSigningSecret())
    .update(encoded)
    .digest('base64url');

  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(encoded, 'base64url').toString('utf8'),
    ) as ClientSessionPayload;
    if (!parsed.clientId || !parsed.userId || typeof parsed.exp !== 'number') {
      return null;
    }
    if (parsed.exp <= Date.now()) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function defaultUserIdForClient(client: Pick<ClientBotConfig, 'slug' | 'portalAuth'>): string {
  if (client.portalAuth?.userId?.trim()) {
    return client.portalAuth.userId.trim().toLowerCase();
  }
  if (client.slug === 'corbett-rajae-homestay') {
    return 'corbett-rajae';
  }
  return client.slug.toLowerCase();
}

export function defaultInitialPasswordForClient(client: Pick<ClientBotConfig, 'slug'>): string {
  const password = process.env.INITIAL_CLIENT_PASSWORD?.trim();
  if (!password || password.length < 12) {
    throw new Error(`INITIAL_CLIENT_PASSWORD (12+ characters) is required to seed client ${client.slug}.`);
  }
  return password;
}

export function sanitizeClientForPublic(client: ClientBotConfig): ClientBotConfig {
  const userId = defaultUserIdForClient(client);
  return {
    ...client,
    portalAuth: {
      userId,
      hasPassword: Boolean(client.portalAuth?.passwordHash || client.portalAuth?.hasPassword),
    },
  };
}
