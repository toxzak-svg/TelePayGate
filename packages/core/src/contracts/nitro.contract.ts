import { Address, beginCell, Contract, ContractProvider, Sender, SendMode } from "@ton/core";

export interface NitroSwapParams {
  amountIn: bigint;
  minAmountOut: bigint;
  recipient: Address;
  deadline: number;
}

export class NitroSwapContract implements Contract {
  constructor(readonly address: Address) {}
  static createFromAddress(address: Address) {
    return new NitroSwapContract(address);
  }
  async sendSwap(provider: ContractProvider, via: Sender, params: NitroSwapParams, value: bigint) {
    const body = beginCell()
      .storeUint(0x25938561, 32)
      .storeUint(0, 64)
      .storeCoins(params.amountIn)
      .storeCoins(params.minAmountOut)
      .storeAddress(params.recipient)
      .storeUint(params.deadline, 32)
      .endCell();
    await provider.internal(via, { value, sendMode: SendMode.PAY_GAS_SEPARATELY, body });
  }
}
