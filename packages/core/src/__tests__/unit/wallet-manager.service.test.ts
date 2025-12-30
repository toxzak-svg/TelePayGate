import WalletManagerService from "../../services/wallet-manager.service";
import TonPaymentService from "../../services/ton-payment.service";
import EncryptionUtil from "../../utils/encryption.util";

process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
process.env.WALLET_ENCRYPTION_KEY =
  "0000000000000000000000000000000000000000000000000000000000000000";

describe("WalletManagerService", () => {
  const baseDeps = () => {
    const mockDb = {
      oneOrNone: jest.fn(),
      one: jest.fn(),
    } as any;

    const mockTonService: jest.Mocked<Partial<TonPaymentService>> = {
      initializeWallet: jest.fn().mockResolvedValue(undefined),
      getWalletAddress: jest.fn().mockReturnValue("EQCwalletaddress"),
      generatePaymentLink: jest
        .fn()
        .mockImplementation((addr, _amnt) => `${addr}`),
      checkIncomingPayments: jest.fn().mockResolvedValue(false),
    };

    const mockEncryption: Partial<EncryptionUtil> = {
      encrypt: jest.fn().mockReturnValue("encrypted-mnemonic"),
    };

    return { mockDb, mockTonService, mockEncryption };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.TON_MIN_CONFIRMATIONS;
  });

  it("creates a deposit record and returns deposit details", async () => {
    const { mockDb, mockTonService, mockEncryption } = baseDeps();
    mockDb.oneOrNone.mockResolvedValueOnce(null);
    mockDb.one
      .mockResolvedValueOnce({ id: "wallet-1" })
      .mockResolvedValueOnce({ id: "deposit-1" });

    const service = new WalletManagerService();
    (service as any).db = mockDb;
    (service as any).tonService =
      mockTonService as unknown as TonPaymentService;
    (service as any).encryption = mockEncryption as EncryptionUtil;
    (service as any).minConfirmations = 2;

    jest
      .spyOn<any, any>(service as any, "startDepositPoll")
      .mockResolvedValue(undefined);

    const result = await service.createDepositAddress(
      "user-1",
      "payment-1",
      12.34,
    );

    expect(mockTonService.initializeWallet).toHaveBeenCalledTimes(1);
    expect(mockDb.one).toHaveBeenCalledTimes(2);
    expect(result).toEqual({
      depositId: "deposit-1",
      address: "EQCwalletaddress",
      expectedAmount: 12.34,
      expiresAt: expect.any(Date),
      paymentLink: "EQCwalletaddress",
      minConfirmations: 2,
    });
  });

  it("reuses initialized wallet on subsequent deposit creation", async () => {
    const { mockDb, mockTonService, mockEncryption } = baseDeps();
    mockDb.oneOrNone.mockResolvedValue({
      id: "wallet-1",
      mnemonic: "encrypted-mnemonic",
    });
    mockDb.one.mockResolvedValue({ id: "deposit-2" });

    const service = new WalletManagerService();
    (service as any).db = mockDb;
    (service as any).tonService =
      mockTonService as unknown as TonPaymentService;
    (service as any).encryption = mockEncryption as EncryptionUtil;
    (service as any).minConfirmations = 2;

    await service.createDepositAddress("user-1", "payment-2", 2);

    expect(mockTonService.initializeWallet).toHaveBeenCalledTimes(1);
    expect(mockDb.one).toHaveBeenCalledTimes(1); // only deposit inserts
  });
});
