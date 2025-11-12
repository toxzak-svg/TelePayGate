const { mnemonicNew, mnemonicToPrivateKey } = require('@ton/crypto');
const { WalletContractV4 } = require('@ton/ton');

async function generateWallet() {
  console.log('🔐 Generating TON Wallet...\n');
  
  try {
    // Generate new mnemonic (24 words)
    const mnemonic = await mnemonicNew(24);
    
    // Generate key pair
    const keyPair = await mnemonicToPrivateKey(mnemonic);
    
    // Create wallet contract
    const wallet = WalletContractV4.create({
      publicKey: keyPair.publicKey,
      workchain: 0
    });
    
    console.log('✅ Wallet Generated Successfully!\n');
    console.log('='.repeat(70));
    console.log('📝 MNEMONIC (24 words) - SAVE THIS SECURELY!');
    console.log('='.repeat(70));
    console.log(mnemonic.join(' '));
    console.log('\n' + '='.repeat(70));
    console.log('📍 WALLET ADDRESS');
    console.log('='.repeat(70));
    console.log(wallet.address.toString());
    console.log('\n' + '='.repeat(70));
    console.log('⚠️  IMPORTANT SECURITY NOTES:');
    console.log('='.repeat(70));
    console.log('1. Save the mnemonic in a secure password manager');
    console.log('2. Never share your mnemonic with anyone');
    console.log('3. Add mnemonic to .env as TON_WALLET_MNEMONIC');
    console.log('4. Never commit .env to git');
    console.log('5. For production, use a hardware wallet or secure key management');
    console.log('='.repeat(70));
    console.log('\n💡 Add to your .env file:');
    console.log('='.repeat(70));
    console.log(`TON_WALLET_MNEMONIC="${mnemonic.join(' ')}"`);
    console.log(`PLATFORM_TON_WALLET=${wallet.address.toString()}`);
    console.log('='.repeat(70));
    console.log('\n📚 For testnet funds, visit:');
    console.log('https://t.me/testgiver_ton_bot');
    console.log('\n');
  } catch (error) {
    console.error('❌ Error generating wallet:', error.message);
    process.exit(1);
  }
}

generateWallet();
