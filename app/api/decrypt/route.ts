import { NextResponse } from 'next/server';

const ZCASH_DECRYPT_API_URL = process.env.ZCASH_DECRYPT_API_URL;

interface OutputInfo {
  protocol: string;
  amount_zats: number;
  index: number;
  transfer_type: string;
  direction: string;
  memo: string;
}

interface TransactionDetails {
  transaction_id: string;
  transaction_hash: string;
  amount_zats: number;
  amount_zec: number;
  incoming_zats: number;
  incoming_zec: number;
  change_zats: number;
  change_zec: number;
  outgoing_zats: number;
  outgoing_zec: number;
  fee_zats: number;
  fee_zec: number;
  timestamp: string;
  block_height: number;
  outputs: OutputInfo[];
  tx_size_bytes: number;
}

export async function POST(req: Request) {
  if (!ZCASH_DECRYPT_API_URL) {
    return NextResponse.json(
      { error: 'ZCASH_DECRYPT_API_URL is not configured on the server' },
      { status: 500 },
    );
  }

  let body: { txid?: string; ufvk?: string; height?: number };

  try {
    body = (await req.json()) as { txid?: string; ufvk?: string; height?: number };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { txid, ufvk, height } = body;

  if (!txid || !ufvk) {
    return NextResponse.json({ error: 'txid and ufvk are required' }, { status: 400 });
  }

  const baseUrl = ZCASH_DECRYPT_API_URL.replace(/\/$/, '');
  const targetUrl = `${baseUrl}/decrypt`;

  try {
    const upstreamResponse = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ txid, ufvk, height }),
    });

    const text = await upstreamResponse.text();

    if (!upstreamResponse.ok) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = text;
      }

      return NextResponse.json(
        {
          error: 'Decrypt API returned an error',
          status: upstreamResponse.status,
          details: parsed,
        },
        { status: 502 },
      );
    }

    const data = JSON.parse(text) as TransactionDetails;

    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: 'Failed to call decrypt API', details: message },
      { status: 500 },
    );
  }
}
