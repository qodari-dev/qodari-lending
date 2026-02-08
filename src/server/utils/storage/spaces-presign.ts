import { env } from '@/env';
import { createHash, createHmac, randomUUID } from 'node:crypto';

function hmac(key: Buffer | string, value: string): Buffer {
  return createHmac('sha256', key).update(value, 'utf8').digest();
}

function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function encodePath(path: string): string {
  return path
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

function createPresignedUrl(args: {
  method: 'PUT' | 'GET';
  fileKey: string;
  expiresInSeconds?: number;
}): string {
  const endpoint = new URL(env.DO_SPACES_ENDPOINT);
  const host = endpoint.host;
  const region = env.DO_SPACES_REGION;
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const expiresInSeconds = args.expiresInSeconds ?? 900;
  const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
  const bucketKeyPath = `${env.DO_SPACES_BUCKET}/${args.fileKey}`;
  const canonicalUri = `/${encodePath(bucketKeyPath)}`;
  const signedHeaders = 'host';

  const query = new URLSearchParams({
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${env.DO_SPACES_KEY}/${credentialScope}`,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': String(expiresInSeconds),
    'X-Amz-SignedHeaders': signedHeaders,
  });

  const canonicalQueryString = query
    .toString()
    .split('&')
    .sort()
    .join('&');
  const canonicalHeaders = `host:${host}\n`;
  const payloadHash = 'UNSIGNED-PAYLOAD';
  const canonicalRequest = [
    args.method,
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');

  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    sha256(canonicalRequest),
  ].join('\n');

  const kDate = hmac(`AWS4${env.DO_SPACES_SECRET}`, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, 's3');
  const kSigning = hmac(kService, 'aws4_request');
  const signature = createHmac('sha256', kSigning).update(stringToSign, 'utf8').digest('hex');

  return `${endpoint.protocol}//${host}${canonicalUri}?${canonicalQueryString}&X-Amz-Signature=${signature}`;
}

function normalizeFileName(fileName: string): string {
  const normalized = fileName
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 120);

  return normalized || 'documento';
}

export function buildDatedFileKey(prefix: string, fileName: string): string {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(now.getUTCDate()).padStart(2, '0');

  return `${prefix}/${yyyy}/${mm}/${dd}/${randomUUID()}-${normalizeFileName(fileName)}`;
}

export function createSpacesPresignedPutUrl(
  fileKey: string,
  expiresInSeconds?: number
): string {
  return createPresignedUrl({
    method: 'PUT',
    fileKey,
    expiresInSeconds,
  });
}

export function createSpacesPresignedGetUrl(
  fileKey: string,
  expiresInSeconds?: number
): string {
  return createPresignedUrl({
    method: 'GET',
    fileKey,
    expiresInSeconds,
  });
}
