
import { NextRequest, NextResponse } from 'next/server';
import { checkBotProtection } from './lib/bot-protection';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect all API routes and key pages
  const guardedRoutes = [
    '/api/blockchain-info',
    '/api/search',
    '/api/scan-wallet',
    '/blocks',
    '/txs',
    '/',
  ];

  const shouldGuard = guardedRoutes.some((route) => pathname.startsWith(route));

  if (shouldGuard) {
    const protection = checkBotProtection(request);

    if (!protection.allowed) {
      const retryAfter = protection.retryAfter || 60;

      if (protection.reason === 'bot_ua') {
        return new NextResponse(JSON.stringify({ error: 'Forbidden', message: 'Bot access deny' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new NextResponse(
        JSON.stringify({
          error: 'Too Many Requests',
          message: protection.reason === 'banned' ? 'IP banned due to abuse' : 'Rate limit exceeded',
          retryAfter,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(retryAfter),
          },
        }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$|.*\\.css$|.*\\.js$).*)',
  ],
};
