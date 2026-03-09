import { NextRequest, NextResponse } from 'next/server';
import {
  RateLimiter,
  BlockList,
  ViolationTracker,
  DEFAULT_CONFIG,
  isBotUserAgent,
  hasSuspiciousHeaders,
  isHoneypotPath,
  getClientIp,
  startCleanup,
} from '@/lib/bot-protection';

// ---------------------------------------------------------------------------
// Singleton instances (persist across requests in the same process)
// ---------------------------------------------------------------------------

const apiLimiter = new RateLimiter(DEFAULT_CONFIG.apiRateLimit);
const pageLimiter = new RateLimiter(DEFAULT_CONFIG.pageRateLimit);
const blockList = new BlockList(DEFAULT_CONFIG.blockDurationSeconds);
const violations = new ViolationTracker(5, 300);

// Start periodic cleanup
startCleanup([apiLimiter, pageLimiter], blockList, violations);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function jsonResponse(
  body: Record<string, unknown>,
  status: number,
  extraHeaders?: Record<string, string>,
): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...extraHeaders,
    },
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

function rateLimitResponse(resetAt: number): NextResponse {
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

  // 1. Check if IP is already on the block list
  const blockStatus = blockList.isBlocked(ip);
  if (blockStatus.blocked) {
    return blockedResponse(blockStatus.reason || 'blocked');
  }

  // 2. Honeypot detection — any client probing these is auto-blocked
  if (isHoneypotPath(pathname, DEFAULT_CONFIG.honeypotPaths)) {
    blockList.block(ip, 'honeypot');
    console.warn(`[bot-protection] Honeypot hit: ip=${ip} path=${pathname}`);
    // Return 404 to avoid revealing the honeypot
    return jsonResponse({ error: 'Not Found' }, 404);
  }

  // 3. Bot user-agent detection
  if (isBotUserAgent(ua)) {
    console.warn(
      `[bot-protection] Blocked bot UA: ip=${ip} ua="${ua?.slice(0, 80)}"`,
    );
    return blockedResponse('bot-user-agent');
  }

  // 4. Suspicious header check (only for API routes to avoid blocking
  //    legitimate prefetch/prerender requests to pages)
  const isApiRoute = pathname.startsWith('/api/');
  if (
    DEFAULT_CONFIG.enforceHeaders &&
    isApiRoute &&
    hasSuspiciousHeaders(request.headers)
  ) {
    console.warn(
      `[bot-protection] Suspicious headers: ip=${ip} path=${pathname}`,
    );
    // Don't hard-block, but count as a violation
    const shouldBlock = violations.record(ip);
    if (shouldBlock) {
      blockList.block(ip, 'repeated-suspicious-headers');
      return blockedResponse('suspicious-behavior');
    }
  }

  // 5. Rate limiting
  const limiter = isApiRoute ? apiLimiter : pageLimiter;
  const result = limiter.check(ip);

  if (!result.allowed) {
    console.warn(
      `[bot-protection] Rate limited: ip=${ip} path=${pathname}`,
    );

    // Track repeated violations — auto-block persistent offenders
    const shouldBlock = violations.record(ip);
    if (shouldBlock) {
      blockList.block(ip, 'repeated-rate-limit-violations');
    }

    return rateLimitResponse(result.resetAt);
  }

  // 6. Continue with rate-limit headers on the response
  const response = NextResponse.next();
  response.headers.set('X-RateLimit-Remaining', String(result.remaining));
  response.headers.set('X-RateLimit-Reset', String(result.resetAt));
  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  return response;
}

// ---------------------------------------------------------------------------
// Matcher — run middleware on API routes and pages, skip static assets
// ---------------------------------------------------------------------------

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image  (image optimization)
     * - favicon.ico  (favicon)
     * - public files (images, etc.)
     */
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
