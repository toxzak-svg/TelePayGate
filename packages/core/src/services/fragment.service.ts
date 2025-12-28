export interface FragmentQuote {
  rate: number;
  liquidity: number;
  fee: number;
  estimatedTime: number;
}

export class FragmentService {
  private enabled: boolean;
  private apiUrl: string | undefined;

  constructor() {
    this.enabled = process.env.FRAGMENT_ENABLED === "true";
    this.apiUrl = process.env.FRAGMENT_API_URL;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  async getQuote(
    fromCurrency: string,
    toCurrency: string,
    amount: number,
  ): Promise<FragmentQuote | null> {
    if (!this.enabled) return null;
    return {
      rate: 0.000015,
      liquidity: amount * 10,
      fee: amount * 0.002,
      estimatedTime: 45,
    };
  }

  async execute(
    fromCurrency: string,
    toCurrency: string,
    amount: number,
    minOutput: number,
  ): Promise<{ txHash: string }> {
    if (!this.enabled) throw new Error("Fragment disabled");
    return { txHash: `fragment-${Date.now()}` };
  }
}
