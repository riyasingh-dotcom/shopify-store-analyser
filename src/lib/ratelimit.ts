import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

type HeadersLike = { get(name: string): string | null };

let redis: Redis | undefined;
let groqRl: Ratelimit | undefined;
let shopifyRl: Ratelimit | undefined;
let loginRl: Ratelimit | undefined;

function getRedis(): Redis {
  redis ??= Redis.fromEnv();
  return redis;
}

export function getGroqRatelimit(): Ratelimit {
  groqRl ??= new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.slidingWindow(10, '1 m'),
    prefix: 'ratelimit:groq',
  });
  return groqRl;
}

export function getShopifyRatelimit(): Ratelimit {
  shopifyRl ??= new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.slidingWindow(30, '1 m'),
    prefix: 'ratelimit:shopify',
  });
  return shopifyRl;
}

export function getLoginRatelimit(): Ratelimit {
  loginRl ??= new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.slidingWindow(5, '1 m'),
    prefix: 'ratelimit:login',
  });
  return loginRl;
}

function extractIdentifier(headers: HeadersLike): string {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    // Rightmost IP is appended by trusted infrastructure; leftmost is client-supplied and forgeable.
    const ip = forwarded.split(',').at(-1)?.trim();
    if (ip) return ip;
  }
  const realIp = headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return 'unknown';
}

export function getRateLimitIdentifier(request: Request): string {
  return extractIdentifier(request.headers);
}

export function getRateLimitIdentifierFromHeaders(headers: HeadersLike): string {
  return extractIdentifier(headers);
}
