# Passwordless Login, TOTP, and Backup Codes

## Passwordless Login
Sign in with your email using a secure magic link. No password required. Enter your email, receive a link, and click to access your dashboard.

## Two-Factor Authentication (TOTP)
Enhance your account security by enabling TOTP (Time-based One-Time Password) using an authenticator app (Google Authenticator, Authy, etc.).
- Go to Settings → Two-Factor Authentication
- Click "Start provisioning" to generate a QR code/secret
- Scan with your app and enter the code to confirm

## Backup Codes
Generate backup codes for account recovery if you lose access to your authenticator app.
- Each code can be used once
- Store codes securely
- Use a backup code on the login screen if prompted for TOTP

## FAQ
- **How do I enable/disable TOTP?** Go to Settings and follow the steps under Two-Factor Authentication.
- **How do I use backup codes?** Generate in Settings, then use on login if you can't access your authenticator app.
- **Is my account secure?** Yes, all secrets are encrypted and flows are protected by rate limits and monitoring.

For more details, see the [Passwordless + 2FA Rollout Guide](../docs/guides/passwordless-2fa-rollout.md).
