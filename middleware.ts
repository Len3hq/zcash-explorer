import { NextRequest, NextResponse } from 'next/server';
import {
  RateLimiter,
  BlockList,
  ViolationTracker,
  DEFAULT_CONFIG,
  isBotUserAgent,
  isHoneypotPath,
  getClientIp,
  scoreSuspicion,
  startCleanup,
} from '@/lib/bot-protection';

// ---------------------------------------------------------------------------
// Singleton instances (persist across requests in the same process)
// ---------------------------------------------------------------------------

const apiLimiter = new RateLimiter(DEFAULT_CONFIG.apiRateLimit);
const pageLimiter = new RateLimiter(DEFAULT_CONFIG.pageRateLimit);

/**
 * Per-endpoint rate limiters for routes that are expensive to serve.
 * Each limiter tracks request counts per IP independently.
 */
const endpointLimiters = new Map<string, RateLimiter>(
  Object.entries(DEFAULT_CONFIG.endpointLimits).map(([path, maxRequests]) => [
    path,
    new RateLimiter({ maxRequests, windowSeconds: 60 }),
  ]),
);

const blockList = new BlockList(DEFAULT_CONFIG.blockDurationSeconds);
const violations = new ViolationTracker(5, 300);

/**
 * IPs that have shown suspicious header patterns are tracked here.
 * When a suspicious IP also violates rate limits, their violation weight
 * is doubled — hitting the auto-block threshold twice as fast.
 */
const suspiciousIPs = new Set<string>();

startCleanup(
  [apiLimiter, pageLimiter, ...endpointLimiters.values()],
  blockList,
  violations,
);

// ---------------------------------------------------------------------------
// Response helpers
// ---------------------------------------------------------------------------

function jsonResponse(
  body: Record<string, unknown>,
  status: number,
  extraHeaders?: Record<string, string>,
): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
  });
}

function blockedResponse(reason: string): NextResponse {
  return jsonResponse(
    {
      error: 'Forbidden',
      message: 'Your request has been blocked due to suspicious activity.',
      reason,
    },
    403,
  );
}

function rateLimitResponse(resetAt: number, limitHint?: number): NextResponse {
  const retryAfter = Math.max(1, resetAt - Math.floor(Date.now() / 1000));
  return jsonResponse(
    {
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please slow down.',
      retryAfter,
    },
    429,
    {
      'Retry-After': String(retryAfter),
      'X-RateLimit-Remaining': '0',
      'X-RateLimit-Reset': String(resetAt),
      ...(limitHint !== undefined && { 'X-RateLimit-Limit': String(limitHint) }),
    },
  );
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const ip = getClientIp(request.headers);
  const ua = request.headers.get('user-agent');

  // ── 1. Check block list ──────────────────────────────────────────────────
  const blockStatus = blockList.isBlocked(ip);
  if (blockStatus.blocked) {
    // Permanent blocks (bot UA, honeypot) → 403; temp blocks → 429
    return blockStatus.permanent
      ? blockedResponse(blockStatus.reason || 'blocked')
      : rateLimitResponse(
          Math.floor(Date.now() / 1000) + DEFAULT_CONFIG.blockDurationSeconds,
        );
  }

  // ── 2. Honeypot detection ────────────────────────────────────────────────
  if (isHoneypotPath(pathname, DEFAULT_CONFIG.honeypotPaths)) {
    blockList.permanentBlock(ip, 'honeypot');
    console.warn(`[bot-protection] Honeypot hit: ip=${ip} path=${pathname}`);
    // Return 404 to not reveal the honeypot
    return jsonResponse({ error: 'Not Found' }, 404);
  }

  // ── 3. Bot user-agent → permanent block ─────────────────────────────────
  if (isBotUserAgent(ua)) {
    blockList.permanentBlock(ip, `bot-user-agent: ${ua?.slice(0, 80)}`);
    console.warn(
      `[bot-protection] Blocked bot UA: ip=${ip} ua="${ua?.slice(0, 80)}"`,
    );
    return blockedResponse('bot-user-agent');
  }

  // ── 4. Suspicion scoring ─────────────────────────────────────────────────
  const isApiRoute = pathname.startsWith('/api/');
  const suspicionScore = scoreSuspicion(request.headers);

  if (suspicionScore >= 3) {
    suspiciousIPs.add(ip);
    console.warn(
      `[bot-protection] Suspicious IP ${ip} score=${suspicionScore} path=${pathname}`,
    );
    // On API routes, pre-emptively record a violation so suspicious IPs
    // reach the auto-block threshold faster than legitimate users
    if (isApiRoute) {
      const shouldBlock = violations.record(ip);
      if (shouldBlock) {
        blockList.block(ip, 'repeated-suspicious-headers');
        return blockedResponse('suspicious-behavior');
      }
    }
  }

  // Suspicious IPs count double on rate-limit violations (hits auto-block faster)
  const violationWeight = suspiciousIPs.has(ip) ? 2 : 1;

  // ── 5. Global per-IP rate limit ──────────────────────────────────────────
  const limiter = isApiRoute ? apiLimiter : pageLimiter;
  const globalResult = limiter.check(ip);

  if (!globalResult.allowed) {
    console.warn(`[bot-protection] Rate limited: ip=${ip} path=${pathname}`);
    const shouldBlock = violations.record(ip, violationWeight);
    if (shouldBlock) {
      blockList.block(ip, 'repeated-rate-limit-violations');
    }
    return rateLimitResponse(globalResult.resetAt);
  }

  // ── 6. Per-endpoint stricter rate limit ──────────────────────────────────
  if (isApiRoute) {
    for (const [prefix, epLimiter] of endpointLimiters) {
      if (pathname.startsWith(prefix)) {
        const epResult = epLimiter.check(ip);
        if (!epResult.allowed) {
          console.warn(
            `[bot-protection] Endpoint rate limited: ip=${ip} endpoint=${prefix}`,
          );
          const shouldBlock = violations.record(ip, violationWeight);
          if (shouldBlock) {
            blockList.block(ip, `endpoint-abuse: ${prefix}`);
          }
          return rateLimitResponse(
            epResult.resetAt,
            DEFAULT_CONFIG.endpointLimits[prefix],
          );
        }
        break; // Only one prefix can match
      }
    }
  }

  // ── 7. Pass through — attach rate-limit and security headers ────────────
  const response = NextResponse.next();
  response.headers.set('X-RateLimit-Remaining', String(globalResult.remaining));
  response.headers.set('X-RateLimit-Reset', String(globalResult.resetAt));
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  return response;
}

// ---------------------------------------------------------------------------
// Matcher — run on all routes except static assets
// ---------------------------------------------------------------------------

export const config = {
  matcher: [
    /*
     * Match every path except:
     * - _next/static  (static chunks)
     * - _next/image   (image optimisation)
     * - favicon.ico
     * - public static files (svg, png, jpg, …)
     */
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
