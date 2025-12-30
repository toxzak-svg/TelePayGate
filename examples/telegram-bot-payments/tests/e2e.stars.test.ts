describe.skip("E2E Stars Payments", () => {
  test("manual end-to-end payment", () => {
    // This test requires:
    // - TELEGRAM_BOT_TOKEN set
    // - Bot started and reachable
    // - User initiates /start and completes Stars payment
    // - TelePayGate API reachable at TELEPAYGATE_API_URL
    // Verify logs show webhook OK and settlement verification OK.
    expect(true).toBe(true);
  });
});

