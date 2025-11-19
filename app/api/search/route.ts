import { NextResponse } from 'next/server';
import { getBlock, getRawTransaction } from '@/lib/zcashRpcClient';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').trim();

  if (!q) {
    return NextResponse.json({ error: 'Missing query parameter "q"' }, { status: 400 });
  }

  // Numeric: treat as block height (handled directly on the client, but return a hint here too)
  if (/^\d+$/.test(q)) {
    return NextResponse.json({ type: 'block', id: q });
  }

  // Try block hash first
  try {
    await getBlock(q);
    return NextResponse.json({ type: 'block', id: q });
  } catch (e) {
    // fall through to try transaction
  }

  // Try transaction id
  try {
    await getRawTransaction(q, false);
    return NextResponse.json({ type: 'tx', id: q });
  } catch (e) {
    // not a tx either
  }

  return NextResponse.json({ type: 'not-found' }, { status: 404 });
}
