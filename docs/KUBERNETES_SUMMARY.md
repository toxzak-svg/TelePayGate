# TelePayGate Kubernetes Configuration Summary

## Overview

This document summarizes the Kubernetes configuration that has been set up for TelePayGate. The configuration uses Kustomize for managing manifests across different environments (development, desktop, and production).

## What Was Configured

### 1. Base Configuration ([`bridge/base/`](../bridge/base/))

The base configuration contains all the core Kubernetes resources needed to run TelePayGate:

#### Core Resources Created:

- **Namespace** ([`0-telepaygate-namespace.yaml`](../bridge/base/0-telepaygate-namespace.yaml)): Isolated namespace for TelePayGate resources
- **ConfigMap** ([`configmap.yaml`](../bridge/base/configmap.yaml)): Non-sensitive configuration (80+ environment variables)
- **Secret** ([`secret.yaml`](../bridge/base/secret.yaml)): Sensitive credentials and secrets
- **PersistentVolumeClaims** ([`pvc.yaml`](../bridge/base/pvc.yaml)): Storage for PostgreSQL (10Gi) and Redis (2Gi)

#### Deployments:

1. **API Deployment** ([`api-deployment.yaml`](../bridge/base/api-deployment.yaml))
   - Main application server
   - Uses ConfigMap and Secret for environment variables
   - Includes health checks (liveness and readiness probes)
   - 1 replica (base configuration)

2. **PostgreSQL Deployment** ([`db-deployment.yaml`](../bridge/base/db-deployment.yaml))
   - PostgreSQL 16 database
   - Persistent storage mounted
   - Liveness probe for health monitoring
   - Credentials from Secret

3. **Redis Deployment** ([`redis-deployment.yaml`](../bridge/base/redis-deployment.yaml))
   - Redis 7 Alpine
   - Persistent storage mounted
   - Liveness probe for health monitoring

4. **MailHog Deployment** ([`mailhog-deployment.yaml`](../bridge/base/mailhog-deployment.yaml))
   - Email testing service
   - SMTP (1025) and HTTP (8025) ports

5. **SDK Builder Deployment** ([`sdk_builder-deployment.yaml`](../bridge/base/sdk_builder-deployment.yaml))
   - Background build process for SDK packages

#### Services:

- **API Service** ([`api-service.yaml`](../bridge/base/api-service.yaml)): Internal service for API
- **API Expose** ([`api-expose.yaml`](../bridge/base/api-expose.yaml)): External exposure for API
- **Database Service** ([`db-service.yaml`](../bridge/base/db-service.yaml)): Internal service for PostgreSQL
- **Database Expose** ([`db-expose.yaml`](../bridge/base/db-expose.yaml)): External exposure for database
- **Redis Service** ([`redis-service.yaml`](../bridge/base/redis-service.yaml)): Internal service for Redis
- **Redis Expose** ([`redis-expose.yaml`](../bridge/base/redis-expose.yaml)): External exposure for Redis
- **MailHog Service** ([`mailhog-service.yaml`](../bridge/base/mailhog-service.yaml)): Internal service for MailHog
- **MailHog Expose** ([`mailhog-expose.yaml`](../bridge/base/mailhog-expose.yaml)): External exposure for MailHog
- **SDK Builder Expose** ([`sdk_builder-expose.yaml`](../bridge/base/sdk_builder-expose.yaml)): External exposure for SDK builder

#### Networking:

- **Ingress** ([`ingress.yaml`](../bridge/base/ingress.yaml)): External routing configuration
  - Routes traffic to API and MailHog
  - Configured for `telepaygate.local` and `mailhog.telepaygate.local`
- **Network Policy** ([`default-network-policy.yaml`](../bridge/base/default-network-policy.yaml)): Traffic isolation and security

### 2. Production Overlay ([`bridge/overlays/production/`](../bridge/overlays/production/))

Production-specific configurations that override base settings:

#### Patches:

1. **ConfigMap Patch** ([`configmap-patch.yaml`](../bridge/overlays/production/configmap-patch.yaml))
   - Sets `NODE_ENV` to "production"
   - Enables SSL for database connections
   - Enables TON mainnet
   - Disables simulation modes
   - Enables CAPTCHA
   - Sets production URLs
   - Adjusts log level to "warn"

2. **API Deployment Patch** ([`api-deployment-patch.yaml`](../bridge/overlays/production/api-deployment-patch.yaml))
   - Scales to 3 replicas
   - Adds resource limits:
     - Requests: 512Mi memory, 250m CPU
     - Limits: 1Gi memory, 1000m CPU

3. **Database Deployment Patch** ([`db-deployment-patch.yaml`](../bridge/overlays/production/db-deployment-patch.yaml))
   - Increases storage to 50Gi
   - Adds resource limits:
     - Requests: 1Gi memory, 500m CPU
     - Limits: 2Gi memory, 2000m CPU

4. **Redis Deployment Patch** ([`redis-deployment-patch.yaml`](../bridge/overlays/production/redis-deployment-patch.yaml))
   - Increases storage to 5Gi
   - Adds resource limits:
     - Requests: 256Mi memory, 100m CPU
     - Limits: 512Mi memory, 500m CPU

5. **Ingress Patch** ([`ingress-patch.yaml`](../bridge/overlays/production/ingress-patch.yaml))
   - Enables SSL redirect
   - Adds TLS configuration with Let's Encrypt
   - Updates hosts to production domains
   - Configures for `api.yourdomain.com` and `mailhog.yourdomain.com`

6. **Secret Patch Template** ([`secret-patch.yaml.example`](../bridge/overlays/production/secret-patch.yaml.example))
   - Template for production secrets
   - Must be copied to `secret-patch.yaml` and filled with actual values
   - Never commit actual secrets!

### 3. Desktop Overlay ([`bridge/overlays/desktop/`](../bridge/overlays/desktop/))

Desktop/development-specific configurations for local development:

- Service overrides for local development
- Simplified networking for desktop environments

### 4. Deployment Automation

#### Deployment Script ([`bridge/deploy.sh`](../bridge/deploy.sh))

Automated deployment script that:
- Checks prerequisites (kubectl, kustomize, docker)
- Builds Docker images
- Pushes images to registry
- Updates image references in Kustomization
- Validates secrets configuration
- Deploys to specified environment (dev/prod/desktop)
- Waits for pods to be ready
- Shows deployment status and access information

Usage:
```bash
chmod +x bridge/deploy.sh
./bridge/deploy.sh dev                    # Deploy to development
./bridge/deploy.sh prod my-registry v1.0.0 # Deploy to production
./bridge/deploy.sh desktop                # Deploy to desktop
```

#### Git Ignore ([`bridge/.gitignore`](../bridge/.gitignore))

Prevents committing sensitive files:
- Secret files
- Kustomize build artifacts
- Temporary files
- Local overrides
- IDE files

### 5. Documentation

#### Comprehensive Guide ([`bridge/README.md`](../bridge/README.md))

Complete deployment documentation including:
- Prerequisites and requirements
- Architecture overview
- Directory structure explanation
- Quick start guide
- Configuration management
- Deployment instructions
- Scaling strategies
- Monitoring and troubleshooting
- Security best practices

#### Quick Reference ([`docs/KUBERNETES_SETUP.md`](KUBERNETES_SETUP.md))

Concise setup guide for quick deployment:
- Quick start steps
- Architecture summary
- Common commands
- Troubleshooting tips

## Key Features

### Configuration Management

- **Separation of Concerns**: ConfigMaps for non-sensitive data, Secrets for sensitive data
- **Environment-Specific**: Different overlays for dev, desktop, and production
- **Kustomize**: Declarative configuration management with overlays

### Security

- **Secrets Isolation**: Sensitive data stored in Kubernetes Secrets
- **Network Policies**: Traffic isolation between components
- **TLS Support**: SSL/TLS configuration for production
- **RBAC Ready**: Structure supports Role-Based Access Control

### Scalability

- **Horizontal Scaling**: API can be scaled to multiple replicas
- **Resource Limits**: CPU and memory limits defined for all services
- **HPA Ready**: Configuration supports Horizontal Pod Autoscaler

### High Availability

- **Multiple Replicas**: Production uses 3 API replicas
- **Health Checks**: Liveness and readiness probes on all services
- **Persistent Storage**: Data persistence for database and cache

### Monitoring

- **Health Endpoints**: All services have health checks
- **Logging**: Structured logging with configurable levels
- **Resource Monitoring**: Resource usage tracked via limits and requests

## Next Steps

### For Development

1. Review and update [`bridge/base/secret.yaml`](../bridge/base/secret.yaml) with your development credentials
2. Build the Docker image: `docker build -t telepaygate-api:latest .`
3. Deploy: `kubectl apply -k bridge/base`
4. Access via port-forwarding:
   ```bash
   kubectl port-forward -n telepaygate svc/api 3000:3000
   kubectl port-forward -n telepaygate svc/mailhog 8025:8025
   ```

### For Production

1. Copy and configure production secrets:
   ```bash
   cp bridge/overlays/production/secret-patch.yaml.example bridge/overlays/production/secret-patch.yaml
   # Edit with actual production values
   ```

2. Update production configuration:
   - Edit [`bridge/overlays/production/configmap-patch.yaml`](../bridge/overlays/production/configmap-patch.yaml) with production URLs
   - Edit [`bridge/overlays/production/ingress-patch.yaml`](../bridge/overlays/production/ingress-patch.yaml) with production domains
   - Update [`bridge/overlays/production/kustomization.yaml`](../bridge/overlays/production/kustomization.yaml) with your container registry

3. Build and push image:
   ```bash
   docker build -t telepaygate-api:v1.0.0 .
   docker tag telepaygate-api:v1.0.0 your-registry/telepaygate-api:v1.0.0
   docker push your-registry/telepaygate-api:v1.0.0
   ```

4. Deploy:
   ```bash
   kubectl apply -k bridge/overlays/production
   ```

5. Configure DNS:
   - Point `api.yourdomain.com` to your ingress controller
   - Point `mailhog.yourdomain.com` to your ingress controller

6. Set up TLS:
   - Install cert-manager if not already installed
   - Configure Let's Encrypt issuer
   - Certificates will be automatically provisioned

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      Ingress Controller                     │
│                   (NGINX with TLS)                        │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        ▼              ▼              ▼
┌──────────────┐ ┌──────────┐ ┌──────────┐
│   API Pod    │ │ MailHog  │ │ (Future) │
│  (3x prod)  │ │   Pod    │ │ Services │
└──────┬───────┘ └──────────┘ └──────────┘
       │
       ├─────────────────┬─────────────────┐
       │                 │                 │
       ▼                 ▼                 ▼
┌──────────┐    ┌──────────┐    ┌──────────┐
│PostgreSQL│    │  Redis   │    │ (Future) │
│   Pod    │    │   Pod    │    │ Services │
└──────────┘    └──────────┘    └──────────┘
       │                 │
       ▼                 ▼
┌──────────┐    ┌──────────┐
│  PVC     │    │  PVC     │
│ (50Gi)   │    │  (5Gi)   │
└──────────┘    └──────────┘
```

## File Structure

```
bridge/
├── base/                              # Base configuration
│   ├── 0-telepaygate-namespace.yaml   # Namespace
│   ├── configmap.yaml                 # Non-sensitive config
│   ├── secret.yaml                    # Sensitive config
│   ├── pvc.yaml                      # Persistent volumes
│   ├── api-deployment.yaml           # API deployment
│   ├── api-service.yaml              # API service
│   ├── api-expose.yaml               # API exposure
│   ├── db-deployment.yaml            # Database deployment
│   ├── db-service.yaml               # Database service
│   ├── db-expose.yaml               # Database exposure
│   ├── redis-deployment.yaml         # Redis deployment
│   ├── redis-service.yaml            # Redis service
│   ├── redis-expose.yaml            # Redis exposure
│   ├── mailhog-deployment.yaml       # MailHog deployment
│   ├── mailhog-service.yaml          # MailHog service
│   ├── mailhog-expose.yaml           # MailHog exposure
│   ├── sdk_builder-deployment.yaml   # SDK builder
│   ├── sdk_builder-expose.yaml       # SDK builder exposure
│   ├── default-network-policy.yaml   # Network security
│   ├── ingress.yaml                  # External routing
│   └── kustomization.yaml           # Kustomize config
├── overlays/
│   ├── desktop/                      # Desktop overlay
│   │   ├── kustomization.yaml
│   │   └── service overrides
│   └── production/                   # Production overlay
│       ├── kustomization.yaml
│       ├── configmap-patch.yaml
│       ├── api-deployment-patch.yaml
│       ├── db-deployment-patch.yaml
│       ├── redis-deployment-patch.yaml
│       ├── ingress-patch.yaml
│       └── secret-patch.yaml.example
├── deploy.sh                         # Deployment script
├── .gitignore                       # Git ignore rules
└── README.md                         # Documentation
```

## Environment Variables

### Configured in ConfigMap (Non-sensitive):

- Server settings (NODE_ENV, PORT, API_URL)
- Database connection parameters
- Redis configuration
- Telegram settings (non-sensitive)
- TON blockchain settings (non-sensitive)
- DEX integration settings
- Conversion settings
- Feature flags
- Logging configuration
- Background worker settings

### Configured in Secret (Sensitive):

- Database credentials
- API keys (Telegram, TON, CoinGecko, etc.)
- JWT secrets
- Encryption keys
- SMTP credentials
- Webhook secrets
- Third-party service credentials

## Security Considerations

1. **Never commit secrets**: Use the provided `.gitignore` to prevent committing sensitive files
2. **Rotate secrets regularly**: Update secrets periodically in production
3. **Use strong secrets**: Generate secure secrets using `openssl rand -base64 32`
4. **Enable TLS**: Use HTTPS for all external communications in production
5. **Network policies**: Restrict pod-to-pod communication
6. **Resource limits**: Prevent resource exhaustion attacks
7. **Image scanning**: Scan container images for vulnerabilities before deployment

## Troubleshooting

### Common Issues

1. **Pods not starting**: Check pod logs and describe pod for events
2. **Database connection issues**: Verify Secret values and PVC status
3. **Image pull errors**: Check image registry access and credentials
4. **Ingress not working**: Verify ingress controller and DNS configuration

### Debug Commands

```bash
# Check pod status
kubectl get pods -n telepaygate

# View logs
kubectl logs -l app=telepaygate -n telepaygate -f

# Describe resources
kubectl describe pod <pod-name> -n telepaygate
kubectl describe svc <service-name> -n telepaygate

# Test connectivity
kubectl run -it --rm debug --image=curlimages/curl --restart=Never -- curl http://api:3000/health -n telepaygate
```

## Support

For detailed information, see:
- [Complete Deployment Guide](../bridge/README.md)
- [Quick Setup Guide](KUBERNETES_SETUP.md)
- [Project Documentation](../docs/)

For issues or questions:
- Check existing documentation
- Open an issue on GitHub
- Contact the TelePayGate team
