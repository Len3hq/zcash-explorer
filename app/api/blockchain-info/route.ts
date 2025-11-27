import { NextResponse } from 'next/server';
import { getBlockCount } from '@/lib/zcashRpcClient';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const blockCount = await getBlockCount();
    return NextResponse.json({ blocks: blockCount });
  } catch (error) {
    console.error('[blockchain-info] Failed to fetch block count:', error);
    return NextResponse.json(
      { error: 'Failed to fetch block count' },
      { status: 500 }
    );
  }
}
