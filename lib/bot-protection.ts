
import { NextRequest } from 'next/server';

// Configuration
const BANNED_UA_PATTERNS = [
    /curl/i,
    /python-requests/i,
    /scrapy/i,
    /wget/i,
    /http-client/i,
    /axios/i,
    /go-http-client/i,
    /mj12bot/i,
    /ahrefsbot/i,
    /semrushbot/i,
    /dotbot/i,
    /rogue-bot/i,
    /bytespider/i,
    /headless/i,
    /puppeteer/i,
    /selenium/i,
    /phantomjs/i,
];

// Honeypot paths that should never be accessed by a legitimate user/browser
const HONEYPOT_PATHS = [
    '/wp-login.php',
    '/.env',
    '/.git/config',
    '/id_rsa',
    '/aws/credentials',
    '/dump.sql',
    '/database.sql',
    '/admin/login',
    '/bitrix/admin',
];

const BAN_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours (stricter ban for detected malice)

interface ClientRecord {
    isBanned: boolean;
    bannedUntil: number;
    reason: string;
}

// In-memory store
const clientRecords = new Map<string, ClientRecord>();

// Cleanup interval
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
let lastCleanup = Date.now();

function cleanup() {
    const now = Date.now();
    if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
    lastCleanup = now;

    Array.from(clientRecords.entries()).forEach(([ip, record]) => {
        if (now > record.bannedUntil) {
            clientRecords.delete(ip);
        }
    });
}

function getClientIP(request: NextRequest): string {
    const forwardedFor = request.headers.get('x-forwarded-for');
    if (forwardedFor) {
        return forwardedFor.split(',')[0].trim();
    }
    const realIP = request.headers.get('x-real-ip');
    if (realIP) {
        return realIP.trim();
    }
    return request.ip || 'unknown';
}

function banIP(ip: string, reason: string) {
    clientRecords.set(ip, {
        isBanned: true,
        bannedUntil: Date.now() + BAN_DURATION_MS,
        reason,
    });
}

export type ProtectionResult = {
    allowed: boolean;
    reason?: 'bot_ua' | 'banned' | 'suspicious_headers' | 'honeypot';
    retryAfter?: number;
};

export function checkBotProtection(request: NextRequest): ProtectionResult {
    cleanup();

    const ip = getClientIP(request);
    const now = Date.now();
    const ua = request.headers.get('user-agent') || '';
    const { pathname } = request.nextUrl;

    // 1. Check Ban Status
    const record = clientRecords.get(ip);
    if (record && record.isBanned) {
        if (now < record.bannedUntil) {
            const retryAfter = Math.ceil((record.bannedUntil - now) / 1000);
            return { allowed: false, reason: 'banned', retryAfter };
        }
        clientRecords.delete(ip); // Ban expired
    }

    // 2. Honeypot check (Instant Ban)
    if (HONEYPOT_PATHS.some(path => pathname.includes(path))) {
        banIP(ip, `Accessing honeypot: ${pathname}`);
        return { allowed: false, reason: 'honeypot', retryAfter: 86400 };
    }

    // 3. User-Agent check
    if (!ua || BANNED_UA_PATTERNS.some((pattern) => pattern.test(ua))) {
        return { allowed: false, reason: 'bot_ua' };
    }

    // 4. Header Heuristics
    // API routes typically come from browsers (with Referer/Origin) or trusted clients.
    // Missing Accept-Language or excessively short Accept headers are suspicious.
    const acceptLanguage = request.headers.get('accept-language');

    // Very crude heuristic: legitimate browsers almost always send accept-language
    if (!acceptLanguage) {
        // Allow if it's a known search engine? (handled by UA check mostly)
        // For this app, strict mode:
        return { allowed: false, reason: 'suspicious_headers' };
    }

    // API specific checks
    if (pathname.startsWith('/api/')) {
        const referer = request.headers.get('referer');
        const origin = request.headers.get('origin');

        // If accessing API directly without referer (e.g. curl/postman), block it
        // Unless you want to allow dev tools, but for bot protection on public app:
        if (!referer && !origin) {
            return { allowed: false, reason: 'suspicious_headers' };
        }
    }

    return { allowed: true };
}
