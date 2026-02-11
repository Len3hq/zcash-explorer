
import fs from 'fs';
import path from 'path';

// Load .env.local manually for the script
try {
    const envPath = path.resolve(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
        const envConfig = fs.readFileSync(envPath, 'utf8');
        envConfig.split('\n').forEach((line) => {
            const match = line.match(/^([^=]+)=(.*)$/);
            if (match) {
                const key = match[1].trim();
                const value = match[2].trim().replace(/^["']|["']$/g, '');
                if (!process.env[key]) {
                    process.env[key] = value;
                }
            }
        });
        console.log('Loaded .env.local');
    }
} catch (e) {
    console.warn('Failed to load .env.local', e);
}

async function verify() {
    // Dynamically import client after env vars are loaded
    const client = await import('./lib/zcashRpcClient');
    const { getBlockchainInfo, getBlockCount, getBlockHash, getBlock, getNetworkHashPs, getChainTxStats, getRawTransaction } = client;

    console.log('Starting RPC Verification...');

    try {
        console.log('\n1. getBlockchainInfo:');
        const info = await getBlockchainInfo();
        console.log('Success:', !!info);
        if (info) console.log('Chain:', info.chain, 'Blocks:', info.blocks);

        console.log('\n2. getBlockCount:');
        const height = await getBlockCount();
        console.log('Success:', typeof height === 'number');
        console.log('Height:', height);

        if (typeof height === 'number') {
            console.log('\n3. getBlockHash (tip):');
            const hash = await getBlockHash(height);
            console.log('Success:', typeof hash === 'string');
            console.log('Hash:', hash);

            if (hash) {
                console.log('\n4. getBlock (tip):');
                const block = await getBlock(hash);
                console.log('Success:', !!block);
                console.log('Tx Count:', block?.tx?.length || block?.nTx);

                // Try getting a tx from this block
                const txs = block?.tx;
                if (Array.isArray(txs) && txs.length > 0) {
                    const txid = typeof txs[0] === 'string' ? txs[0] : txs[0].txid;
                    console.log('\n5. getRawTransaction:', txid);
                    const tx = await getRawTransaction(txid, true);
                    console.log('Success:', !!tx);
                }
            }
        }

        console.log('\n6. getNetworkHashPs:');
        const hashrate = await getNetworkHashPs();
        console.log('Success:', typeof hashrate === 'number');
        console.log('Hashrate:', hashrate);

        console.log('\n7. getChainTxStats:');
        const stats = await getChainTxStats(100);
        console.log('Success:', stats !== undefined); // Might be null if unsupported
        console.log('Stats:', stats);

    } catch (e) {
        console.error('Verification Failed:', e);
    }
}

verify();
