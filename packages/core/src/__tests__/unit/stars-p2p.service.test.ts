import { StarsP2PService } from "../../services/stars-p2p.service";

describe("StarsP2PService", () => {
  const mockDb = {
    oneOrNone: jest.fn(),
    one: jest.fn(),
    any: jest.fn(),
    none: jest.fn(),
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates buy order and checks status", async () => {
    mockDb.one.mockResolvedValueOnce({ id: "order-1" });
    mockDb.oneOrNone.mockResolvedValueOnce({
      id: "order-1",
      status: "matched",
    });
    mockDb.oneOrNone.mockResolvedValueOnce({
      ton_tx_hash: "0xabc",
    });
    const svc = new StarsP2PService(mockDb as any);
    const order = await svc.createBuyOrder("user-1", "1.0", "0.00001");
    expect(order.id).toBe("order-1");
  });
});
