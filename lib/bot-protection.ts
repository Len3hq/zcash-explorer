
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
];

const BAN_DURATION_MS = 10 * 60 * 1000; // 10 minutes
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_API_REQUESTS = 100; // 30 requests per minute for API
const MAX_PAGE_REQUESTS = 200; // 60 requests per minute for Pages

interface ClientRecord {
    count: number;
    windowStart: number;
    isBanned: boolean;
    bannedUntil: number;
    violationCount: number;
}

// In-memory store (Note: This is per-instance, use Redis for multi-instance/production)
const clientRecords = new Map<string, ClientRecord>();

// Cleanup interval
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
let lastCleanup = Date.now();

function cleanup() {
    const now = Date.now();
    if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
    lastCleanup = now;

    Array.from(clientRecords.entries()).forEach(([ip, record]) => {
        // Keep banned records until ban expires
        if (record.isBanned) {
            if (now > record.bannedUntil) {
                clientRecords.delete(ip);
            }
            return;
        }
        // Remove old records
        if (now - record.windowStart > RATE_LIMIT_WINDOW_MS * 2) {
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

function isBotUserAgent(request: NextRequest): boolean {
    const ua = request.headers.get('user-agent') || '';
    if (!ua) return true; // Block empty UA
    return BANNED_UA_PATTERNS.some((pattern) => pattern.test(ua));
}

export type RateLimitResult = {
    allowed: boolean;
    reason?: 'bot_ua' | 'banned' | 'rate_limit';
    remaining: number;
    retryAfter?: number; // seconds
};

export function checkBotProtection(request: NextRequest): RateLimitResult {
    cleanup();

    const ip = getClientIP(request);
    const { pathname } = request.nextUrl;
    const now = Date.now();

    // 1. Check User-Agent
    if (isBotUserAgent(request)) {
        return { allowed: false, reason: 'bot_ua', remaining: 0 };
    }

    // 2. Get or create record
    let record = clientRecords.get(ip);
    if (!record) {
        record = { count: 0, windowStart: now, isBanned: false, bannedUntil: 0, violationCount: 0 };
        clientRecords.set(ip, record);
    }

    // 3. Check Ban Status
    if (record.isBanned) {
        if (now < record.bannedUntil) {
            const retryAfter = Math.ceil((record.bannedUntil - now) / 1000);
            return { allowed: false, reason: 'banned', remaining: 0, retryAfter };
        }
        // Ban expired
        record.isBanned = false;
        record.bannedUntil = 0;
        record.count = 0;
        record.windowStart = now;
    }

    // 4. Rate Limiting Logic
    // Reset window if needed
    if (now - record.windowStart > RATE_LIMIT_WINDOW_MS) {
        record.count = 0;
        record.windowStart = now;
    }

    record.count++;

    const isApi = pathname.startsWith('/api/');
    const liimt = isApi ? MAX_API_REQUESTS : MAX_PAGE_REQUESTS;

    if (record.count > liimt) {
        record.violationCount++;

        // Ban if multiple violations or extreme excess
        if (record.violationCount >= 3 || record.count > liimt * 2) {
            record.isBanned = true;
            record.bannedUntil = now + BAN_DURATION_MS;
            const retryAfter = Math.ceil(BAN_DURATION_MS / 1000);
            return { allowed: false, reason: 'banned', remaining: 0, retryAfter };
        }

        const resetIn = Math.ceil((RATE_LIMIT_WINDOW_MS - (now - record.windowStart)) / 1000);
        return { allowed: false, reason: 'rate_limit', remaining: 0, retryAfter: resetIn };
    }

    return { allowed: true, remaining: liimt - record.count };
}
