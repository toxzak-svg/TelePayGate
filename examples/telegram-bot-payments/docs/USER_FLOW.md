# User Flow

## Start

- User sends `/start`.
- Bot replies with product list and inline buttons:
  - Labels include product name and price in XTR.

## Invoice

- User taps a product button.
- Bot sends `sendInvoice`:
  - `currency: "XTR"`
  - `payload`: `{ user_id, item_id }`
  - `prices`: smallest units (Stars × 100).
  - Description includes detailed product info.

## Pre-Checkout

- Bot validates:
  - `currency === "XTR"`
  - `payload` contains `item_id`.
- Responds OK or error via `answerPreCheckoutQuery`.

## Successful Payment

- Bot logs transaction fields and notifies monitoring.
- Bot calls TelePayGate webhook to persist payment.
- Bot verifies settlement via `GET /payments/:id` and backoff retries.
- Bot delivers digital goods (download link).

