# Testing Guide

This guide covers unit, integration, and end-to-end testing for the Telegram Payment Gateway.

## Test Types
- Unit tests: `npm run test --workspaces`
- Integration tests: Simulate payment, deposit, conversion flows
- End-to-end tests: Full API and dashboard workflows

## Coverage
- Target: 80%+
- Run: `npm run test --workspaces -- --coverage`

## Best Practices
- Isolate test environments with `.env.test`
- Use mocks for external APIs
- Validate database state after each test
- Review test failures and fix promptly
