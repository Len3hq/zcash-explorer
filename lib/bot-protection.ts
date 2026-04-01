/**
 * Bot Protection & Rate Limiting
 *
 * Provides in-memory rate limiting, bot user-agent detection, and
 * suspicious-pattern analysis for the Zcash Explorer API.
 *
 * Design notes:
 * - Uses a sliding-window counter stored in a Map (suitable for single-process
 *   deployments). For multi-instance deployments, swap the Map for Redis.
 * - Separate rate-limit tiers for regular pages vs. API endpoints, plus
 *   per-endpoint stricter limits for expensive routes.
 * - Known bot/scraper user-agent patterns are blocked outright.
 * - Clients that hit the honeypot path are permanently flagged and blocked.
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
  /** Per-endpoint stricter limits for expensive API routes */
  endpointLimits: Record<string, number>;
  /** How long (seconds) a temp-blocked IP stays blocked */
  blockDurationSeconds: number;
  /** Paths that act as honeypots — any client hitting these is permanently blocked */
  honeypotPaths: string[];
  /** Whether to check for missing/suspicious headers */
  enforceHeaders: boolean;
}

export const DEFAULT_CONFIG: BotProtectionConfig = {
  apiRateLimit: { maxRequests: 60, windowSeconds: 60 },    // 60 req/min per IP
  pageRateLimit: { maxRequests: 120, windowSeconds: 60 },  // 120 req/min per IP
  endpointLimits: {
    '/api/scan-wallet': 5,      // Scans up to 100 blocks + spawns crypto process
    '/api/decrypt': 10,         // Spawns child decryptor process per call
    '/api/search': 20,          // Triggers live RPC lookups
    '/api/zec-market': 20,
    '/api/blockchain-info': 30,
  },
  blockDurationSeconds: 600,   // 10-minute temp block
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
// Known bot / scraper user-agent patterns — block on match
// ---------------------------------------------------------------------------

const BOT_UA_PATTERNS: RegExp[] = [
  // ── Programmatic HTTP libraries ──────────────────────────────────────────
  /^python-requests\//i,
  /^python-urllib\//i,
  /^python\//i,
  /^curl\//i,
  /^wget\//i,
  /^go-http-client\//i,
  /^java\//i,
  /^ruby\//i,
  /^php\//i,
  /^perl\//i,
  /^r\b/i,                       // R language HTTP client
  /libwww-perl/i,
  /^lwp-/i,
  /^axios\//i,
  /^node-fetch\//i,
  /^node-http\//i,
  /^undici\//i,
  /^got\//i,
  /^superagent\//i,
  /^aiohttp\//i,
  /^httpx\//i,
  /^requests\//i,
  /pycurl/i,
  /scrapy/i,
  /^okhttp\//i,
  /apache-httpclient/i,
  /java\.net\.http/i,
  /^powershell\//i,
  /^winhttp/i,
  /http\.rb/i,
  /mechanize/i,
  /scraperapi/i,
  /phantomjs/i,
  /headlesschrome/i,
  /httpie/i,

  // ── Security / recon scanners ────────────────────────────────────────────
  /masscan/i,
  /\bnmap\b/i,
  /nikto/i,
  /sqlmap/i,
  /dirbuster/i,
  /\bdirb\b/i,
  /gobuster/i,
  /feroxbuster/i,
  /ffuf/i,
  /wfuzz/i,
  /zgrab/i,
  /nuclei/i,
  /wpscan/i,
  /burpsuite/i,
  /\bzap\b/i,
  /acunetix/i,
  /nessus/i,
  /openvas/i,
  /hydra/i,
  /medusa/i,

  // ── SEO / data harvesting bots ───────────────────────────────────────────
  /semrushbot/i,
  /ahrefsbot/i,
  /mj12bot/i,
  /dotbot/i,
  /rogerbot/i,
  /dataforseo/i,
  /blexbot/i,
  /megaindex/i,
  /serpstatbot/i,
  /seokicks/i,
  /zoominfobot/i,
  /petalbot/i,
  /bytespider/i,
  /exabot/i,
  /seznambot/i,
  /ia_archiver/i,               // Wayback Machine archiver
  /archive\.org_bot/i,
  /proximic/i,

  // ── AI training / content scrapers ──────────────────────────────────────
  /claudebot/i,
  /gptbot/i,
  /ccbot/i,
  /anthropic-ai/i,
  /google-extended/i,
  /amazonbot/i,
  /applebot/i,
  /cohere-ai/i,
  /omgili/i,
  /diffbot/i,
  /imagesiftbot/i,

  // ── Generic catch-all (keep last to not shadow specific patterns) ────────
  /\b(bot|crawler|spider|scraper|harvest)\b/i,
];

// Legitimate bots that are allowed through (search engines, social previews,
// uptime monitors). These are matched BEFORE the block list above.
const ALLOWED_BOT_PATTERNS: RegExp[] = [
  /googlebot/i,
  /bingbot/i,
  /slurp/i,             // Yahoo
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

  get size(): number {
    return this.windows.size;
  }
}

// ---------------------------------------------------------------------------
// Blocked-IP tracker
// ---------------------------------------------------------------------------

interface BlockRecord {
  blockedAt: number;
  reason: string;
  /** Permanent blocks survive the blockDuration expiry check */
  permanent?: boolean;
}

export class BlockList {
  private blocked: Map<string, BlockRecord> = new Map();
  private readonly blockDuration: number;

  constructor(blockDurationSeconds: number) {
    this.blockDuration = blockDurationSeconds;
  }

  /** Temporary block — expires after blockDurationSeconds. */
  block(ip: string, reason: string): void {
    this.blocked.set(ip, { blockedAt: Math.floor(Date.now() / 1000), reason });
  }

  /** Permanent block — never expires automatically. */
  permanentBlock(ip: string, reason: string): void {
    this.blocked.set(ip, {
      blockedAt: Math.floor(Date.now() / 1000),
      reason,
      permanent: true,
    });
  }

  isBlocked(ip: string): { blocked: boolean; reason?: string; permanent?: boolean } {
    const record = this.blocked.get(ip);
    if (!record) return { blocked: false };

    if (record.permanent) {
      return { blocked: true, reason: record.reason, permanent: true };
    }

    const now = Math.floor(Date.now() / 1000);
    if (now - record.blockedAt >= this.blockDuration) {
      this.blocked.delete(ip);
      return { blocked: false };
    }

    return { blocked: true, reason: record.reason };
  }

  /** Purge expired temp blocks (permanent blocks are never removed here). */
  cleanup(): void {
    const now = Math.floor(Date.now() / 1000);
    for (const [ip, record] of this.blocked) {
      if (!record.permanent && now - record.blockedAt >= this.blockDuration) {
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

  /**
   * Record a violation. Returns true if the IP should now be auto-blocked.
   * Pass weight > 1 to count the violation multiple times (e.g., for suspicious IPs).
   */
  record(ip: string, weight = 1): boolean {
    const now = Math.floor(Date.now() / 1000);
    const entry = this.violations.get(ip);

    if (!entry || now - entry.firstSeen >= this.windowSeconds) {
      this.violations.set(ip, { count: weight, firstSeen: now });
      return weight >= this.threshold;
    }

    entry.count += weight;
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

  for (const pattern of ALLOWED_BOT_PATTERNS) {
    if (pattern.test(ua)) return false;
  }

  for (const pattern of BOT_UA_PATTERNS) {
    if (pattern.test(ua)) return true;
  }

  return false;
}

/**
 * Scores how suspicious a request looks based on missing browser headers.
 * Real browsers always send Accept, Accept-Language, Accept-Encoding, and
 * sec-fetch-* on same-origin/cross-origin requests. Automated clients
 * frequently omit these.
 *
 * Score guide:
 *   0–1 : Normal
 *   2   : Mildly suspicious (might be a stripped proxy)
 *   3+  : Likely automated
 */
export function scoreSuspicion(headers: {
  get(name: string): string | null;
}): number {
  let score = 0;
  const ua = headers.get('user-agent') ?? '';

  if (ua.length < 10) score += 2;                          // Implausibly short UA
  if (!headers.get('accept')) score += 1;                  // Browsers always send Accept
  if (!headers.get('accept-language')) score += 1;         // Browsers always send Accept-Language
  if (!headers.get('accept-encoding')) score += 1;         // Browsers always send Accept-Encoding
  if (!headers.get('sec-fetch-site') &&
      !headers.get('sec-fetch-mode')) score += 1;          // Headless / plain HTTP client

  return score;
}

/**
 * Legacy helper — kept for backward compatibility.
 * Prefer scoreSuspicion() for fine-grained control.
 */
export function hasSuspiciousHeaders(headers: {
  get(name: string): string | null;
}): boolean {
  return scoreSuspicion(headers) >= 3;
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
 * Extracts the real client IP from request headers.
 * Checks Cloudflare, Vercel, and standard proxy headers in priority order.
 */
export function getClientIp(headers: {
  get(name: string): string | null;
}): string {
  // Cloudflare sets this to the actual client IP (more reliable than x-forwarded-for)
  const cfIp = headers.get('cf-connecting-ip');
  if (cfIp) return cfIp.trim();

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
// Periodic cleanup (every 5 minutes to prevent memory leaks)
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

  if (typeof cleanupInterval === 'object' && 'unref' in cleanupInterval) {
    (cleanupInterval as { unref(): void }).unref();
  }
}
