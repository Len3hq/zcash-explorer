import { NextResponse } from 'next/server';

const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';
const ZEC_ID = 'zcash';
const VS_CURRENCY = 'usd';
const CHART_DAYS = 30; // match the "30 Days" price chart in the UI

const COINGECKO_API_KEY = process.env.COINGECKO_API_KEY;
const COINGECKO_KEY_HEADER =
  process.env.COINGECKO_KEY_HEADER || 'x-cg-demo-api-key';

interface MarketChartPoint extends Array<number> {
  0: number; // timestamp
  1: number; // price
}

export async function GET() {
  try {
    // Use free public CoinGecko endpoints by default. If a key is provided,
    // send it via the configured header; otherwise call without auth.
    const headers: HeadersInit = {};
    if (COINGECKO_API_KEY) {
      headers[COINGECKO_KEY_HEADER] = COINGECKO_API_KEY;
    }

    const marketUrl = `${COINGECKO_BASE}/coins/markets?vs_currency=${VS_CURRENCY}&ids=${ZEC_ID}&price_change_percentage=24h`;
    // For free/standard CoinGecko plans, "interval=hourly" is not allowed for this endpoint.
    // Using days=30 without an explicit interval returns data suitable for a 30‑day chart
    // while staying within free plan limits.
    const chartUrl = `${COINGECKO_BASE}/coins/${ZEC_ID}/market_chart?vs_currency=${VS_CURRENCY}&days=${CHART_DAYS}`;

    const [marketRes, chartRes] = await Promise.all([
      fetch(marketUrl, { headers, next: { revalidate: 300 } }),
      fetch(chartUrl, { headers, next: { revalidate: 300 } }),
    ]);

    if (!marketRes.ok) {
      const text = await marketRes.text().catch(() => '');
      console.error('[zec-market] marketRes not ok', marketRes.status, text);

      // Surface common auth/rate-limit problems clearly.
      if (marketRes.status === 401 || marketRes.status === 403 || marketRes.status === 429) {
        return NextResponse.json(
          {
            error:
              'CoinGecko rejected the request (auth or rate limit). Check COINGECKO_API_KEY, COINGECKO_KEY_HEADER, and your CoinGecko plan limits.',
            status: marketRes.status,
            details: text,
          },
          { status: 502 },
        );
      }

      return NextResponse.json(
        {
          error: 'Failed to fetch market data from CoinGecko',
          status: marketRes.status,
          details: text,
        },
        { status: 502 },
      );
    }

    if (!chartRes.ok) {
      const text = await chartRes.text().catch(() => '');
      console.error('[zec-market] chartRes not ok', chartRes.status, text);
      return NextResponse.json(
        {
          error: 'Failed to fetch chart data from CoinGecko',
          status: chartRes.status,
          details: text,
        },
        { status: 502 },
      );
    }

    const marketJson = await marketRes.json();
    const chartJson = await chartRes.json();

    const market = Array.isArray(marketJson) && marketJson.length > 0 ? marketJson[0] : null;
    if (!market) {
      return NextResponse.json(
        { error: 'No market data for ZEC from CoinGecko' },
        { status: 502 },
      );
    }

    const prices: MarketChartPoint[] = Array.isArray(chartJson?.prices)
      ? chartJson.prices
      : [];

    const payload = {
      symbol: market.symbol,
      name: market.name,
      currentPriceUsd: market.current_price ?? null,
      change24hPct: market.price_change_percentage_24h ?? null,
      marketCapUsd: market.market_cap ?? null,
      volume24hUsd: market.total_volume ?? null,
      circulatingSupply: market.circulating_supply ?? null,
      totalSupply: market.total_supply ?? null,
      maxSupply: market.max_supply ?? null,
      high24hUsd: market.high_24h ?? null,
      low24hUsd: market.low_24h ?? null,
      marketCapRank: market.market_cap_rank ?? null,
      priceSeries: prices.map(([timestamp, price]) => ({ timestamp, price })),
      source: 'CoinGecko',
    };

    return NextResponse.json(payload, {
      headers: {
        'Cache-Control': 's-maxage=300, stale-while-revalidate=900',
      },
    });
  } catch (error) {
    console.error('[zec-market] Error fetching data from CoinGecko', error);
    return NextResponse.json(
      { error: 'Unexpected error fetching ZEC market data' },
      { status: 500 },
    );
  }
}
