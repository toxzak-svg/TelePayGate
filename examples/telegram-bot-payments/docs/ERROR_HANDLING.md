# Error Handling Guide

## sendInvoice

- Missing product: show alert via `answerCbQuery`.
- API error: reply with a generic failure message and log details.

## pre_checkout_query

- Invalid currency or payload: respond false with message.
- Internal exception: respond false and notify monitoring.

## successful_payment

- TelePayGate webhook:
  - Non-2xx: log error, notify monitoring, continue delivery after settlement.
  - Network errors: retry via limiter schedule (implicit throttling).
- Settlement verification:
  - Retry with exponential backoff.
  - If not confirmed: inform user delivery will follow after settlement.

## Security

- Never log secrets or raw tokens.
- Derive credentials only from user id; do not persist locally.
- Use environment variables for bot token and API base URL.

