
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
      const retryAfter = protection.retryAfter || 86400;

      if (protection.reason === 'bot_ua' || protection.reason === 'suspicious_headers') {
        return new NextResponse(JSON.stringify({ error: 'Forbidden', message: 'Access Denied (Bot/Security Check Failed)' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (protection.reason === 'honeypot') {
        // Ban enacted
        return new NextResponse(JSON.stringify({ error: 'Banned', message: 'Access Denied (Security Violation)' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (protection.reason === 'banned') {
        return new NextResponse(JSON.stringify({
          error: 'Banned',
          message: 'Your IP has been banned due to suspicious activity.',
          retryAfter
        }), {
          status: 403,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(retryAfter)
          },
        });
      }
    }
  }

  return NextResponse.next();

}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$|.*\\.css$|.*\\.js$).*)',
  ],
};
