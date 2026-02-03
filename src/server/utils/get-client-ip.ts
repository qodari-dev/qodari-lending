import type { NextRequest } from 'next/server';

export function getClientIp(req: NextRequest): string {
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  const cfIp = req.headers.get('cf-connecting-ip');
  if (cfIp) {
    return cfIp;
  }

  const remoteAddr = req.headers.get('x-client-ip');
  if (remoteAddr) {
    return remoteAddr;
  }

  if ('ip' in req && typeof req.ip === 'string') return req.ip;

  return 'unknown';
}
