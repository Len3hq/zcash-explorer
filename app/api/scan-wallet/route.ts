import { NextRequest, NextResponse } from 'next/server';
import { getBlockCount, getBlockHash } from '@/lib/zcashRpcClient';

const SCANNER_API_URL = process.env.ZCASH_SCANNER_API_URL || 'http://localhost:3005';

interface ScanWalletRequest {
  ufvk: string;
  blockHeightOption: 'specific' | 'last1hr' | 'walletBirthday';
  specificBlocks?: string;
  walletBirthdayHeight?: number;
}

async function getCurrentBlockHeight(): Promise<number> {
  try {
    const blockCount = await getBlockCount();
    return blockCount;
  } catch (error) {
    console.error('Error fetching current block height:', error);
    throw new Error('Unable to determine current block height');
  }
}

async function validateBlockExists(height: number): Promise<boolean> {
  try {
    await getBlockHash(height);
    return true;
  } catch (error) {
    return false;
  }
}

async function generateBlockHeightList(
  option: string,
  specificBlocks?: string,
  walletBirthdayHeight?: number
): Promise<number[]> {
  const currentHeight = await getCurrentBlockHeight();

  if (option === 'specific' && specificBlocks) {
    // Parse comma-separated or range of block heights
    const blocks: number[] = [];
    const parts = specificBlocks.split(',').map(s => s.trim());
    
    for (const part of parts) {
      if (part.includes('-')) {
        // Range like "100-105"
        const [start, end] = part.split('-').map(n => parseInt(n.trim(), 10));
        if (!isNaN(start) && !isNaN(end) && start <= end) {
          for (let i = start; i <= end; i++) {
            blocks.push(i);
          }
        }
      } else {
        const height = parseInt(part, 10);
        if (!isNaN(height)) {
          blocks.push(height);
        }
      }
    }

    // Validate blocks exist (limit to first 10 for performance)
    const validatedBlocks: number[] = [];
    for (const height of blocks.slice(0, 100)) {
      const exists = await validateBlockExists(height);
      if (exists) {
        validatedBlocks.push(height);
      }
    }

    return validatedBlocks.length > 0 ? validatedBlocks : blocks.slice(0, 100);
  }

  if (option === 'last1hr') {
    // Zcash block time is ~75 seconds, so ~48 blocks per hour
    const blocksPerHour = 48;
    const startHeight = Math.max(1, currentHeight - blocksPerHour);
    const blocks: number[] = [];
    
    for (let i = startHeight; i <= currentHeight; i++) {
      blocks.push(i);
    }
    
    return blocks;
  }

  if (option === 'walletBirthday' && walletBirthdayHeight) {
    const blocks: number[] = [];
    const maxBlocks = 100; // Limit to 100 blocks for API
    const startHeight = Math.max(walletBirthdayHeight, currentHeight - maxBlocks + 1);
    
    for (let i = startHeight; i <= currentHeight; i++) {
      blocks.push(i);
    }
    
    return blocks;
  }

  throw new Error('Invalid block height option');
}

export async function POST(request: NextRequest) {
  try {
    const body: ScanWalletRequest = await request.json();
    const { ufvk, blockHeightOption, specificBlocks, walletBirthdayHeight } = body;

    // Validate UFVK
    if (!ufvk || (!ufvk.startsWith('uview1') && !ufvk.startsWith('uviewtest1'))) {
      return NextResponse.json(
        { error: 'Invalid UFVK format. Must start with uview1 (mainnet) or uviewtest1 (testnet)' },
        { status: 400 }
      );
    }

    // Generate block height list based on option
    const blockHeights = await generateBlockHeightList(
      blockHeightOption,
      specificBlocks,
      walletBirthdayHeight
    );

    if (blockHeights.length === 0) {
      return NextResponse.json(
        { error: 'No valid block heights to scan' },
        { status: 400 }
      );
    }

    if (blockHeights.length > 100) {
      return NextResponse.json(
        { error: 'Maximum 100 blocks can be scanned at once' },
        { status: 400 }
      );
    }

    // Call the zcashtxdecryption scanner API
    console.log(`Calling scanner API: ${SCANNER_API_URL}/scan with ${blockHeights.length} blocks`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
    
    try {
      const scanResponse = await fetch(`${SCANNER_API_URL}/scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          blockHeights,
          ufvk,
        }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (!scanResponse.ok) {
        const errorText = await scanResponse.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }
        
        console.error('Scanner API error:', scanResponse.status, errorData);
        
        return NextResponse.json(
          { error: errorData.error || errorData.message || 'Scanner service returned an error', details: errorData },
          { status: 502 }
        );
      }

      const scanResult = await scanResponse.json();
      return NextResponse.json(scanResult);
    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        console.error('Scanner API timeout');
        return NextResponse.json(
          { error: 'Scanner service timed out after 60 seconds' },
          { status: 504 }
        );
      }
      
      console.error('Scanner API fetch error:', fetchError);
      return NextResponse.json(
        { error: 'Failed to connect to scanner service', details: fetchError instanceof Error ? fetchError.message : String(fetchError) },
        { status: 502 }
      );
    }
  } catch (error) {
    console.error('Wallet scan error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
