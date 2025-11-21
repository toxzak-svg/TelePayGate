
import dotenv from 'dotenv';
import path from 'path';
import { initDatabase } from '../src/db/connection';
import { StarsP2PService } from '../src/services/stars-p2p.service';
import { TonPaymentService } from '../src/services/ton-payment.service';

// Load env from root
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

async function main() {
  console.log('🚀 Starting Atomic Swap Test...');

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required');
  }
  if (!process.env.TON_WALLET_MNEMONIC) {
    throw new Error('TON_WALLET_MNEMONIC is required');
  }

  const db = initDatabase(process.env.DATABASE_URL);
  const p2pService = new StarsP2PService(db);

  try {
    // 1. Create a Test Seller User
    console.log('Creating test seller...');
    const seller = await db.one(
      `INSERT INTO users (api_key, api_secret, app_name, description) 
       VALUES ($1, $2, $3, $4) RETURNING id`,
      ['pk_seller_' + Date.now(), 'sk_seller', 'Seller App', 'Test Seller']
    );
    console.log('Seller ID:', seller.id);

    // 2. Create a Wallet for the Seller (Destination for TON)
    // We'll use a random address for testing purposes, or a real one if you want to verify receipt
    // For this test, we'll generate a random keypair/address
    // Actually, let's use the platform wallet address as the destination just to test the transfer (self-transfer)
    // OR better, generate a new random wallet so we don't confuse things.
    
    // We can use TonPaymentService to generate a random wallet? No, it uses mnemonic.
    // Let's just insert a dummy address if we don't care about receiving, 
    // BUT the transfer will fail on-chain if the address is invalid.
    // So we need a valid address.
    // I'll use a known valid address (e.g. the Ton Foundation address or a random valid one)
    // Or I can generate one using @ton/ton
    
    const { mnemonicNew, mnemonicToPrivateKey } = require('@ton/crypto');
    const { WalletContractV4 } = require('@ton/ton');
    
    const mnemonic = await mnemonicNew();
    const keyPair = await mnemonicToPrivateKey(mnemonic);
    const wallet = WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey });
    const sellerAddress = wallet.address.toString();
    
    console.log('Seller Wallet Address:', sellerAddress);

    await db.none(
      `INSERT INTO wallets (user_id, wallet_address, wallet_type, public_key, encrypted_private_key, balance_ton, is_active)
       VALUES ($1, $2, 'external', 'pubkey', 'enckey', 0, true)`,
      [seller.id, sellerAddress]
    );

    // 3. Create a Sell Order (Seller wants to sell 100 Stars for 0.01 TON total -> Rate 0.0001)
    // Let's do 10 Stars for 0.01 TON -> Rate 0.001
    const starsAmount = 10;
    const rate = '0.001'; // 10 * 0.001 = 0.01 TON
    
    console.log(`Creating Sell Order: ${starsAmount} Stars @ ${rate}`);
    const sellOrder = await p2pService.createSellOrder(seller.id, starsAmount, rate);
    console.log('Sell Order Created:', sellOrder.id);

    // 4. Create a Buyer User
    const buyer = await db.one(
        `INSERT INTO users (api_key, api_secret, app_name, description) 
         VALUES ($1, $2, $3, $4) RETURNING id`,
        ['pk_buyer_' + Date.now(), 'sk_buyer', 'Buyer App', 'Test Buyer']
      );
    console.log('Buyer ID:', buyer.id);

    // 5. Create a Buy Order (Buyer wants to buy Stars with TON)
    // Amount TON = 0.01
    const tonAmount = '0.01';
    
    console.log(`Creating Buy Order: ${tonAmount} TON @ ${rate}`);
    // This should trigger the match and swap
    const buyOrder = await p2pService.createBuyOrder(buyer.id, tonAmount, rate);
    console.log('Buy Order Created:', buyOrder.id);

    // 6. Wait and Check Swap Status
    console.log('Waiting for swap execution...');
    await new Promise(r => setTimeout(r, 5000)); // Wait 5 seconds

    const swap = await db.oneOrNone(
        'SELECT * FROM atomic_swaps WHERE buy_order_id = $1',
        [buyOrder.id]
    );

    if (swap) {
        console.log('Swap Record Found:', swap);
        if (swap.status === 'completed') {
            console.log('✅ Swap Completed Successfully!');
            console.log('Tx Hash:', swap.ton_tx_hash);
        } else {
            console.log('⚠️ Swap Status:', swap.status);
            console.log('Check logs for errors.');
        }
    } else {
        console.error('❌ Swap record not found!');
    }

  } catch (err) {
    console.error('Test Failed:', err);
  } finally {
    // Cleanup?
    process.exit(0);
  }
}

main();
