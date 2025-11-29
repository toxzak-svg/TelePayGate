# Security Best Practices

## Key Principles
- Never commit secrets to the repository
- Use environment variables for sensitive data
- Enable 2FA for dashboard access
- Rotate API keys regularly
- Monitor for suspicious activity
- Encrypt wallet keys at rest
- Validate webhook signatures

## Incident Response
- Rotate credentials immediately if exposed
- Review logs for unauthorized access
- Follow backup and recovery procedures

## Secrets & safe storage

Do not commit `.env` or any secret material to source control. Use a secret
manager for production deployments — for example: HashiCorp Vault, AWS
Secrets Manager, Azure KeyVault, Google Secret Manager, or Render/Railway
secret management.

Example local `.env` snippet (do not commit):
```env
POSTGRES_PASSWORD=REPLACE_WITH_STRONG_PASSWORD
JWT_SECRET=$(openssl rand -hex 32)
WALLET_ENCRYPTION_KEY=$(openssl rand -hex 32)
```
