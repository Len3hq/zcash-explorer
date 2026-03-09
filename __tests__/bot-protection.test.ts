import {
  RateLimiter,
  BlockList,
  ViolationTracker,
  isBotUserAgent,
  hasSuspiciousHeaders,
  isHoneypotPath,
  getClientIp,
  DEFAULT_CONFIG,
} from '@/lib/bot-protection';

// ---------------------------------------------------------------------------
// RateLimiter
// ---------------------------------------------------------------------------

describe('RateLimiter', () => {
  it('allows requests within the limit', () => {
    const limiter = new RateLimiter({ maxRequests: 3, windowSeconds: 60 });
    const r1 = limiter.check('ip-1');
    expect(r1.allowed).toBe(true);
    expect(r1.remaining).toBe(2);

    const r2 = limiter.check('ip-1');
    expect(r2.allowed).toBe(true);
    expect(r2.remaining).toBe(1);

    const r3 = limiter.check('ip-1');
    expect(r3.allowed).toBe(true);
    expect(r3.remaining).toBe(0);
  });

  it('blocks requests that exceed the limit', () => {
    const limiter = new RateLimiter({ maxRequests: 2, windowSeconds: 60 });
    limiter.check('ip-2');
    limiter.check('ip-2');
    const r3 = limiter.check('ip-2');
    expect(r3.allowed).toBe(false);
    expect(r3.remaining).toBe(0);
  });

  it('tracks IPs independently', () => {
    const limiter = new RateLimiter({ maxRequests: 1, windowSeconds: 60 });
    const a = limiter.check('ip-a');
    expect(a.allowed).toBe(true);

    const b = limiter.check('ip-b');
    expect(b.allowed).toBe(true);

    // ip-a is now over limit
    const a2 = limiter.check('ip-a');
    expect(a2.allowed).toBe(false);
  });

  it('resets after the window expires', () => {
    const limiter = new RateLimiter({ maxRequests: 1, windowSeconds: 1 });
    limiter.check('ip-3');
    const blocked = limiter.check('ip-3');
    expect(blocked.allowed).toBe(false);

    // Advance time past the window
    const origDateNow = Date.now;
    Date.now = () => origDateNow() + 2000;
    try {
      const after = limiter.check('ip-3');
      expect(after.allowed).toBe(true);
    } finally {
      Date.now = origDateNow;
    }
  });

  it('cleanup removes stale entries', () => {
    const limiter = new RateLimiter({ maxRequests: 10, windowSeconds: 1 });
    limiter.check('stale-ip');
    expect(limiter.size).toBe(1);

    const origDateNow = Date.now;
    Date.now = () => origDateNow() + 5000;
    try {
      limiter.cleanup();
      expect(limiter.size).toBe(0);
    } finally {
      Date.now = origDateNow;
    }
  });

  it('returns correct resetAt timestamp', () => {
    const limiter = new RateLimiter({ maxRequests: 5, windowSeconds: 60 });
    const result = limiter.check('ip-reset');
    const nowSec = Math.floor(Date.now() / 1000);
    expect(result.resetAt).toBeGreaterThanOrEqual(nowSec + 59);
    expect(result.resetAt).toBeLessThanOrEqual(nowSec + 61);
  });
});

// ---------------------------------------------------------------------------
// BlockList
// ---------------------------------------------------------------------------

describe('BlockList', () => {
  it('blocks and reports an IP', () => {
    const bl = new BlockList(600);
    bl.block('1.2.3.4', 'honeypot');
    const status = bl.isBlocked('1.2.3.4');
    expect(status.blocked).toBe(true);
    expect(status.reason).toBe('honeypot');
  });

  it('returns not blocked for unknown IPs', () => {
    const bl = new BlockList(600);
    expect(bl.isBlocked('9.9.9.9').blocked).toBe(false);
  });

  it('unblocks after duration expires', () => {
    const bl = new BlockList(1); // 1-second block
    bl.block('1.2.3.4', 'test');

    const origDateNow = Date.now;
    Date.now = () => origDateNow() + 2000;
    try {
      expect(bl.isBlocked('1.2.3.4').blocked).toBe(false);
    } finally {
      Date.now = origDateNow;
    }
  });

  it('cleanup removes expired blocks', () => {
    const bl = new BlockList(1);
    bl.block('a', 'x');
    bl.block('b', 'y');
    expect(bl.size).toBe(2);

    const origDateNow = Date.now;
    Date.now = () => origDateNow() + 2000;
    try {
      bl.cleanup();
      expect(bl.size).toBe(0);
    } finally {
      Date.now = origDateNow;
    }
  });
});

// ---------------------------------------------------------------------------
// ViolationTracker
// ---------------------------------------------------------------------------

describe('ViolationTracker', () => {
  it('does not auto-block below threshold', () => {
    const vt = new ViolationTracker(3, 300);
    expect(vt.record('ip-v')).toBe(false);
    expect(vt.record('ip-v')).toBe(false);
  });

  it('triggers auto-block at threshold', () => {
    const vt = new ViolationTracker(3, 300);
    vt.record('ip-v2');
    vt.record('ip-v2');
    expect(vt.record('ip-v2')).toBe(true);
  });

  it('resets after window expires', () => {
    const vt = new ViolationTracker(2, 1);
    vt.record('ip-v3');

    const origDateNow = Date.now;
    Date.now = () => origDateNow() + 2000;
    try {
      // Should start fresh window
      expect(vt.record('ip-v3')).toBe(false);
    } finally {
      Date.now = origDateNow;
    }
  });
});

// ---------------------------------------------------------------------------
// isBotUserAgent
// ---------------------------------------------------------------------------

describe('isBotUserAgent', () => {
  it('flags empty/null user agents', () => {
    expect(isBotUserAgent(null)).toBe(true);
    expect(isBotUserAgent(undefined)).toBe(true);
    expect(isBotUserAgent('')).toBe(true);
    expect(isBotUserAgent('   ')).toBe(true);
  });

  it('flags known scraper UAs', () => {
    expect(isBotUserAgent('Scrapy/2.11')).toBe(true);
    expect(isBotUserAgent('python-requests/2.31.0')).toBe(true);
    expect(isBotUserAgent('Go-http-client/1.1')).toBe(true);
    expect(isBotUserAgent('curl/7.88.1')).toBe(true);
    expect(isBotUserAgent('Wget/1.21')).toBe(true);
    expect(isBotUserAgent('Java/11.0.17')).toBe(true);
    expect(isBotUserAgent('node-fetch/1.0')).toBe(true);
    expect(isBotUserAgent('SemrushBot/7')).toBe(true);
    expect(isBotUserAgent('AhrefsBot/7.0')).toBe(true);
    expect(isBotUserAgent('PhantomJS')).toBe(true);
    expect(isBotUserAgent('HeadlessChrome/119.0.0.0')).toBe(true);
  });

  it('flags vulnerability scanners', () => {
    expect(isBotUserAgent('Nmap Scripting Engine')).toBe(true);
    expect(isBotUserAgent('nikto/2.1.6')).toBe(true);
    expect(isBotUserAgent('sqlmap/1.7')).toBe(true);
    expect(isBotUserAgent('nuclei - projectdiscovery')).toBe(true);
  });

  it('allows legitimate browser UAs', () => {
    expect(
      isBotUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
      ),
    ).toBe(false);
    expect(
      isBotUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15',
      ),
    ).toBe(false);
    expect(
      isBotUserAgent(
        'Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0',
      ),
    ).toBe(false);
  });

  it('allows legitimate search engine bots', () => {
    expect(
      isBotUserAgent(
        'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      ),
    ).toBe(false);
    expect(
      isBotUserAgent(
        'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
      ),
    ).toBe(false);
    expect(isBotUserAgent('DuckDuckBot/1.0')).toBe(false);
  });

  it('allows social media bots', () => {
    expect(isBotUserAgent('facebookexternalhit/1.1')).toBe(false);
    expect(isBotUserAgent('Twitterbot/1.0')).toBe(false);
    expect(isBotUserAgent('Slackbot-LinkExpanding 1.0')).toBe(false);
    expect(isBotUserAgent('LinkedInBot/1.0')).toBe(false);
    expect(isBotUserAgent('WhatsApp/2.23.20.0')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// hasSuspiciousHeaders
// ---------------------------------------------------------------------------

describe('hasSuspiciousHeaders', () => {
  function makeHeaders(map: Record<string, string>) {
    return {
      get(name: string) {
        return map[name.toLowerCase()] ?? null;
      },
    };
  }

  it('flags requests missing all standard headers', () => {
    expect(hasSuspiciousHeaders(makeHeaders({}))).toBe(true);
  });

  it('does not flag requests with standard headers', () => {
    expect(
      hasSuspiciousHeaders(
        makeHeaders({
          accept: 'text/html',
          'accept-language': 'en-US',
          'accept-encoding': 'gzip',
        }),
      ),
    ).toBe(false);
  });

  it('does not flag if at least one header is present', () => {
    expect(
      hasSuspiciousHeaders(makeHeaders({ accept: 'text/html' })),
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isHoneypotPath
// ---------------------------------------------------------------------------

describe('isHoneypotPath', () => {
  const honeypots = DEFAULT_CONFIG.honeypotPaths;

  it('detects honeypot paths', () => {
    expect(isHoneypotPath('/wp-admin', honeypots)).toBe(true);
    expect(isHoneypotPath('/wp-login.php', honeypots)).toBe(true);
    expect(isHoneypotPath('/.env', honeypots)).toBe(true);
    expect(isHoneypotPath('/xmlrpc.php', honeypots)).toBe(true);
    expect(isHoneypotPath('/admin', honeypots)).toBe(true);
    expect(isHoneypotPath('/phpmyadmin', honeypots)).toBe(true);
  });

  it('detects honeypot subpaths', () => {
    expect(isHoneypotPath('/wp-admin/install.php', honeypots)).toBe(true);
    expect(isHoneypotPath('/admin/config', honeypots)).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(isHoneypotPath('/WP-ADMIN', honeypots)).toBe(true);
    expect(isHoneypotPath('/Admin', honeypots)).toBe(true);
  });

  it('allows legitimate paths', () => {
    expect(isHoneypotPath('/', honeypots)).toBe(false);
    expect(isHoneypotPath('/api/blockchain-info', honeypots)).toBe(false);
    expect(isHoneypotPath('/block/12345', honeypots)).toBe(false);
    expect(isHoneypotPath('/tx/abc123', honeypots)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getClientIp
// ---------------------------------------------------------------------------

describe('getClientIp', () => {
  function makeHeaders(map: Record<string, string>) {
    return {
      get(name: string) {
        return map[name.toLowerCase()] ?? null;
      },
    };
  }

  it('extracts IP from x-forwarded-for', () => {
    expect(
      getClientIp(makeHeaders({ 'x-forwarded-for': '10.0.0.1, 10.0.0.2' })),
    ).toBe('10.0.0.1');
  });

  it('extracts IP from x-real-ip', () => {
    expect(getClientIp(makeHeaders({ 'x-real-ip': '192.168.1.1' }))).toBe(
      '192.168.1.1',
    );
  });

  it('prefers x-forwarded-for over x-real-ip', () => {
    expect(
      getClientIp(
        makeHeaders({
          'x-forwarded-for': '10.0.0.1',
          'x-real-ip': '192.168.1.1',
        }),
      ),
    ).toBe('10.0.0.1');
  });

  it('returns unknown when no headers present', () => {
    expect(getClientIp(makeHeaders({}))).toBe('unknown');
  });
});

// ---------------------------------------------------------------------------
// Integration: rate limiter + violation tracker + block list
// ---------------------------------------------------------------------------

describe('Integration: rate limit → violation → auto-block', () => {
  it('auto-blocks an IP after repeated rate-limit violations', () => {
    const limiter = new RateLimiter({ maxRequests: 1, windowSeconds: 60 });
    const bl = new BlockList(600);
    const vt = new ViolationTracker(3, 300);

    const ip = '10.10.10.10';

    // First request is allowed
    expect(limiter.check(ip).allowed).toBe(true);

    // Subsequent requests are rate-limited, and each violation is recorded
    for (let i = 0; i < 3; i++) {
      const result = limiter.check(ip);
      expect(result.allowed).toBe(false);
      const shouldBlock = vt.record(ip);
      if (shouldBlock) {
        bl.block(ip, 'repeated-rate-limit-violations');
      }
    }

    // IP should now be blocked
    expect(bl.isBlocked(ip).blocked).toBe(true);
    expect(bl.isBlocked(ip).reason).toBe('repeated-rate-limit-violations');
  });
});

// ---------------------------------------------------------------------------
// Integration: honeypot → block
// ---------------------------------------------------------------------------

describe('Integration: honeypot hit → immediate block', () => {
  it('blocks an IP that hits a honeypot', () => {
    const bl = new BlockList(600);
    const ip = '192.168.5.5';

    // Simulate a honeypot hit
    if (isHoneypotPath('/wp-admin', DEFAULT_CONFIG.honeypotPaths)) {
      bl.block(ip, 'honeypot');
    }

    expect(bl.isBlocked(ip).blocked).toBe(true);
    expect(bl.isBlocked(ip).reason).toBe('honeypot');
  });
});
