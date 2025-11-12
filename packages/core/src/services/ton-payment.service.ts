import { Address, TonClient, WalletContractV4, internal } from '@ton/ton';
import { mnemonicToPrivateKey } from '@ton/crypto';

export class TonPaymentService {
  private client: TonClient;
  private wallet: WalletContractV4;

  constructor(private mnemonic: string[]) {
    this.client = new TonClient({
      endpoint: 'https://toncenter.com/api/v2/jsonRPC',
    });
  }

  async initialize() {
    const key = await mnemonicToPrivateKey(this.mnemonic);
    this.wallet = WalletContractV4.create({
      publicKey: key.publicKey,
      workchain: 0,
    });
  }

  /**
   * Generate payment invoice for TON
   */
  async createPaymentInvoice(
    amountTon: number,
    userId: string,
    description: string
  ): Promise<{ address: string; amount: string; memo: string }> {
    const address = this.wallet.address.toString();
    const memo = `payment_${userId}_${Date.now()}`;

    return {
      address,
      amount: amountTon.toFixed(9),
      memo,
    };
  }

  /**
   * Monitor incoming TON payments
   */
  async monitorPayment(expectedAmount: number, memo: string): Promise<boolean> {
    const transactions = await this.client.getTransactions(
      this.wallet.address,
      { limit: 100 }
    );

    for (const tx of transactions) {
      if (tx.inMessage?.body?.toString().includes(memo)) {
        const received = Number(tx.inMessage.info.value.coins) / 1e9;
        if (received >= expectedAmount) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Send TON to user (withdrawal)
   */
  async sendTon(
    toAddress: string,
    amount: number,
    memo: string
  ): Promise<string> {
    const seqno = await this.wallet.getSeqno();
    
    await this.wallet.sendTransfer({
      seqno,
      messages: [
        internal({
          to: toAddress,
          value: (amount * 1e9).toString(),
          body: memo,
        }),
      ],
    });

    return `Transaction sent`;
  }

  /**
   * Calculate platform fees in TON
   */
  calculateFees(amountTon: number): {
    platform: number;
    network: number;
    total: number;
  } {
    const platformFee = amountTon * 0.005; // 0.5%
    const networkFee = 0.01; // ~0.01 TON network fee

    return {
      platform: platformFee,
      network: networkFee,
      total: platformFee + networkFee,
    };
  }
}
