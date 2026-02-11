import { NextRequest, NextResponse } from 'next/server';

// Rate limit configuration
const RATE_LIMIT_WINDOW_MS = 1000; // 1 second window
const MAX_REQUESTS_PER_WINDOW = 2; // 2 requests per second

// In-memory store for rate limiting (per IP)
// For production at scale, consider using Redis instead
const requestCounts = new Map<string, { count: number; windowStart: number }>();

// Cleanup old entries periodically to prevent memory leaks
const CLEANUP_INTERVAL_MS = 60000; // 1 minute
let lastCleanup = Date.now();

function cleanupOldEntries() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;

  lastCleanup = now;
  const cutoff = now - RATE_LIMIT_WINDOW_MS * 2;

  // Use Array.from for ES compatibility
  Array.from(requestCounts.entries()).forEach(([ip, data]) => {
    if (data.windowStart < cutoff) {
      requestCounts.delete(ip);
    }
  });
}

function getClientIP(request: NextRequest): string {
  // Check common headers for real IP (behind proxies/load balancers)
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // x-forwarded-for can be comma-separated; take the first (original client)
    return forwardedFor.split(',')[0].trim();
  }

  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP.trim();
  }

  // Fallback to connection IP (may not be available in edge runtime)
  return request.ip || 'unknown';
}

function isRateLimited(ip: string): { limited: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const record = requestCounts.get(ip);

  if (!record || now - record.windowStart >= RATE_LIMIT_WINDOW_MS) {
    // New window
    requestCounts.set(ip, { count: 1, windowStart: now });
    return { limited: false, remaining: MAX_REQUESTS_PER_WINDOW - 1, resetIn: RATE_LIMIT_WINDOW_MS };
  }

  // Same window
  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    const resetIn = RATE_LIMIT_WINDOW_MS - (now - record.windowStart);
    return { limited: true, remaining: 0, resetIn: Math.max(resetIn, 0) };
  }

  record.count++;
  const resetIn = RATE_LIMIT_WINDOW_MS - (now - record.windowStart);
  return { limited: false, remaining: MAX_REQUESTS_PER_WINDOW - record.count, resetIn };
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only rate limit routes that hit the GetBlock RPC
  // Excludes: /api/decrypt (Rust service), /api/zec-market (CoinGecko), /decrypt (UI only)
  const rpcRoutes = [
    '/api/blockchain-info',
    '/api/search',
    '/api/scan-wallet',
  ];

  const shouldRateLimit =
    rpcRoutes.includes(pathname) ||
    pathname.startsWith('/block/') ||
    pathname.startsWith('/tx/') ||
    pathname === '/blocks' ||
    pathname === '/txs' ||
    pathname === '/';

  if (!shouldRateLimit) {
    return NextResponse.next();
  }

  // Periodic cleanup
  cleanupOldEntries();

  const clientIP = getClientIP(request);
  const { limited, remaining, resetIn } = isRateLimited(clientIP);

  if (limited) {
    const retryAfterSeconds = Math.ceil(resetIn / 1000);

    return new NextResponse(
      JSON.stringify({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please slow down.',
        retryAfter: retryAfterSeconds,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(retryAfterSeconds),
          'X-RateLimit-Limit': String(MAX_REQUESTS_PER_WINDOW),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil((Date.now() + resetIn) / 1000)),
        },
      }
    );
  }

  // Add rate limit headers to successful responses
  const response = NextResponse.next();
  response.headers.set('X-RateLimit-Limit', String(MAX_REQUESTS_PER_WINDOW));
  response.headers.set('X-RateLimit-Remaining', String(remaining));
  response.headers.set('X-RateLimit-Reset', String(Math.ceil((Date.now() + resetIn) / 1000)));

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$|.*\\.css$|.*\\.js$).*)',
  ],
};
