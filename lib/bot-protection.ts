/**
 * Bot Protection & Rate Limiting
 *
 * Provides in-memory rate limiting, bot user-agent detection, and
 * suspicious-pattern analysis for the Zcash Explorer API.
 *
 * Design notes:
 * - Uses a sliding-window counter stored in a Map (suitable for single-process
 *   deployments). For multi-instance deployments, swap the Map for Redis.
 * - Separate rate-limit tiers for regular pages vs. API endpoints.
 * - Known bot/scraper user-agent patterns are blocked outright.
 * - Clients that hit the honeypot path are flagged and blocked.
 */

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export interface RateLimitConfig {
  /** Max requests allowed in the window */
  maxRequests: number;
  /** Window duration in seconds */
  windowSeconds: number;
}

export interface BotProtectionConfig {
  /** Rate limit for API routes (/api/*) */
  apiRateLimit: RateLimitConfig;
  /** Rate limit for page routes */
  pageRateLimit: RateLimitConfig;
  /** How long (seconds) a flagged IP stays blocked */
  blockDurationSeconds: number;
  /** Paths that act as honeypots — any client hitting these is auto-blocked */
  honeypotPaths: string[];
  /** Whether to check for missing/suspicious headers */
  enforceHeaders: boolean;
}

export const DEFAULT_CONFIG: BotProtectionConfig = {
  apiRateLimit: { maxRequests: 60, windowSeconds: 60 },   // 60 req/min per IP
  pageRateLimit: { maxRequests: 120, windowSeconds: 60 },  // 120 req/min per IP
  blockDurationSeconds: 600,                                // 10-minute block
  honeypotPaths: [
    '/wp-admin',
    '/wp-login.php',
    '/.env',
    '/xmlrpc.php',
    '/admin',
    '/phpmyadmin',
    '/config.php',
  ],
  enforceHeaders: true,
};

// ---------------------------------------------------------------------------
// Known bot / scraper user-agent patterns
// ---------------------------------------------------------------------------

const BOT_UA_PATTERNS: RegExp[] = [
  // Generic crawlers & scrapers
  /scrapy/i,
  /python-requests/i,
  /python-urllib/i,
  /httpx/i,
  /aiohttp/i,
  /go-http-client/i,
  /java\//i,
  /libwww-perl/i,
  /wget/i,
  /curl/i,
  /axios/i,
  /node-fetch/i,
  /undici/i,
  /http\.rb/i,
  /mechanize/i,
  /scraperapi/i,
  /phantomjs/i,
  /headlesschrome/i,

  // SEO / marketing bots (unwanted aggressive scrapers)
  /semrush/i,
  /ahrefs/i,
  /mj12bot/i,
  /dotbot/i,
  /rogerbot/i,
  /dataforseo/i,
  /blexbot/i,
  /megaindex/i,
  /serpstat/i,
  /zoominfobot/i,
  /petalbot/i,

  // Vulnerability scanners
  /nmap/i,
  /nikto/i,
  /sqlmap/i,
  /dirbuster/i,
  /gobuster/i,
  /nuclei/i,
  /masscan/i,
  /wpscan/i,
  /zgrab/i,
  /httpie/i,
];

// Legitimate bots we allow (Googlebot, Bingbot, etc.)
const ALLOWED_BOT_PATTERNS: RegExp[] = [
  /googlebot/i,
  /bingbot/i,
  /slurp/i,           // Yahoo
  /duckduckbot/i,
  /baiduspider/i,
  /yandexbot/i,
  /facebookexternalhit/i,
  /twitterbot/i,
  /linkedinbot/i,
  /discordbot/i,
  /telegrambot/i,
  /whatsapp/i,
  /slackbot/i,
  /uptimerobot/i,
];

// ---------------------------------------------------------------------------
// Sliding-window rate limiter
// ---------------------------------------------------------------------------

interface WindowEntry {
  count: number;
  windowStart: number;
}

export class RateLimiter {
  private windows: Map<string, WindowEntry> = new Map();
  private readonly config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  /**
   * Check whether the given key (usually IP) is within its rate limit.
   * Returns { allowed, remaining, resetAt }.
   */
  check(key: string): { allowed: boolean; remaining: number; resetAt: number } {
    const now = Math.floor(Date.now() / 1000);
    const entry = this.windows.get(key);

    if (!entry || now - entry.windowStart >= this.config.windowSeconds) {
      // Start a new window
      this.windows.set(key, { count: 1, windowStart: now });
      return {
        allowed: true,
        remaining: this.config.maxRequests - 1,
        resetAt: now + this.config.windowSeconds,
      };
    }

    entry.count += 1;

    if (entry.count > this.config.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: entry.windowStart + this.config.windowSeconds,
      };
    }

    return {
      allowed: true,
      remaining: this.config.maxRequests - entry.count,
      resetAt: entry.windowStart + this.config.windowSeconds,
    };
  }

  /** Remove stale entries to prevent memory leaks. */
  cleanup(): void {
    const now = Math.floor(Date.now() / 1000);
    for (const [key, entry] of this.windows) {
      if (now - entry.windowStart >= this.config.windowSeconds * 2) {
        this.windows.delete(key);
      }
    }
  }

  /** Visible for testing. */
  get size(): number {
    return this.windows.size;
  }
}

// ---------------------------------------------------------------------------
// Blocked-IP tracker (auto-block after honeypot hit or repeated violations)
// ---------------------------------------------------------------------------

interface BlockRecord {
  blockedAt: number;
  reason: string;
}

export class BlockList {
  private blocked: Map<string, BlockRecord> = new Map();
  private readonly blockDuration: number;

  constructor(blockDurationSeconds: number) {
    this.blockDuration = blockDurationSeconds;
  }

  block(ip: string, reason: string): void {
    this.blocked.set(ip, { blockedAt: Math.floor(Date.now() / 1000), reason });
  }

  isBlocked(ip: string): { blocked: boolean; reason?: string } {
    const record = this.blocked.get(ip);
    if (!record) return { blocked: false };

    const now = Math.floor(Date.now() / 1000);
    if (now - record.blockedAt >= this.blockDuration) {
      this.blocked.delete(ip);
      return { blocked: false };
    }

    return { blocked: true, reason: record.reason };
  }

  cleanup(): void {
    const now = Math.floor(Date.now() / 1000);
    for (const [ip, record] of this.blocked) {
      if (now - record.blockedAt >= this.blockDuration) {
        this.blocked.delete(ip);
      }
    }
  }

  get size(): number {
    return this.blocked.size;
  }
}

// ---------------------------------------------------------------------------
// Rate-limit violation tracker (auto-block after repeated violations)
// ---------------------------------------------------------------------------

export class ViolationTracker {
  private violations: Map<string, { count: number; firstSeen: number }> = new Map();
  private readonly threshold: number;
  private readonly windowSeconds: number;

  constructor(threshold = 5, windowSeconds = 300) {
    this.threshold = threshold;
    this.windowSeconds = windowSeconds;
  }

  /** Record a violation. Returns true if the IP should now be auto-blocked. */
  record(ip: string): boolean {
    const now = Math.floor(Date.now() / 1000);
    const entry = this.violations.get(ip);

    if (!entry || now - entry.firstSeen >= this.windowSeconds) {
      this.violations.set(ip, { count: 1, firstSeen: now });
      return false;
    }

    entry.count += 1;
    return entry.count >= this.threshold;
  }

  cleanup(): void {
    const now = Math.floor(Date.now() / 1000);
    for (const [ip, entry] of this.violations) {
      if (now - entry.firstSeen >= this.windowSeconds) {
        this.violations.delete(ip);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Detection helpers
// ---------------------------------------------------------------------------

/**
 * Returns true if the user-agent matches a known bad bot pattern
 * and is NOT on the allow-list.
 */
export function isBotUserAgent(ua: string | null | undefined): boolean {
  if (!ua || ua.trim() === '') return true; // empty UA is suspicious

  // Allow known good bots
  for (const pattern of ALLOWED_BOT_PATTERNS) {
    if (pattern.test(ua)) return false;
  }

  // Block known bad bots
  for (const pattern of BOT_UA_PATTERNS) {
    if (pattern.test(ua)) return true;
  }

  return false;
}

/**
 * Returns true if the request has suspicious header characteristics.
 * (Missing Accept, Accept-Language, or Accept-Encoding headers are
 * strong indicators of automated tooling.)
 */
export function hasSuspiciousHeaders(headers: {
  get(name: string): string | null;
}): boolean {
  const accept = headers.get('accept');
  const acceptLang = headers.get('accept-language');
  const acceptEnc = headers.get('accept-encoding');

  // Real browsers always send these
  if (!accept && !acceptLang && !acceptEnc) return true;

  return false;
}

/**
 * Returns true if the requested path matches a honeypot.
 */
export function isHoneypotPath(
  pathname: string,
  honeypotPaths: string[],
): boolean {
  const lower = pathname.toLowerCase();
  return honeypotPaths.some((hp) => lower === hp || lower.startsWith(hp + '/'));
}

/**
 * Extracts the client IP from standard headers.
 */
export function getClientIp(headers: {
  get(name: string): string | null;
}): string {
  // Common proxy headers, in priority order
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0].trim();
    if (first) return first;
  }

  const realIp = headers.get('x-real-ip');
  if (realIp) return realIp.trim();

  return 'unknown';
}

// ---------------------------------------------------------------------------
// Periodic cleanup (runs every 5 minutes to prevent memory leaks)
// ---------------------------------------------------------------------------

let cleanupInterval: ReturnType<typeof setInterval> | null = null;

export function startCleanup(
  rateLimiters: RateLimiter[],
  blockList: BlockList,
  violationTracker: ViolationTracker,
): void {
  if (cleanupInterval) return;
  cleanupInterval = setInterval(() => {
    for (const rl of rateLimiters) rl.cleanup();
    blockList.cleanup();
    violationTracker.cleanup();
  }, 5 * 60 * 1000);

  // Ensure the interval doesn't prevent process shutdown
  if (typeof cleanupInterval === 'object' && 'unref' in cleanupInterval) {
    cleanupInterval.unref();
  }
}
