# TelePayGate Kubernetes Setup

This document provides a quick reference for setting up TelePayGate on Kubernetes.

## Quick Start

### 1. Prerequisites

Ensure you have:
- Kubernetes cluster (v1.24+)
- kubectl installed
- kustomize installed
- Docker installed
- Container registry access

### 2. Configure Secrets

Copy and edit the secret template:

```bash
cp bridge/overlays/production/secret-patch.yaml.example bridge/overlays/production/secret-patch.yaml
nano bridge/overlays/production/secret-patch.yaml
```

**Important**: Never commit actual secrets to version control!

### 3. Build and Push Image

```bash
docker build -t telepaygate-api:latest .
docker tag telepaygate-api:latest your-registry/telepaygate-api:latest
docker push your-registry/telepaygate-api:latest
```

### 4. Deploy

#### Development

```bash
kubectl apply -k bridge/base
```

#### Production

```bash
kubectl apply -k bridge/overlays/production
```

#### Using Deployment Script

```bash
chmod +x bridge/deploy.sh
./bridge/deploy.sh dev
./bridge/deploy.sh prod my-registry.com v1.0.0
```

### 5. Access

#### Development

```bash
# Forward API port
kubectl port-forward -n telepaygate svc/api 3000:3000

# Forward MailHog
kubectl port-forward -n telepaygate svc/mailhog 8025:8025
```

Access at:
- API: http://localhost:3000
- MailHog: http://localhost:8025

#### Production

Access at:
- API: https://api.yourdomain.com
- MailHog: https://mailhog.yourdomain.com

## Architecture

### Components

- **API Service**: Main application server (port 3000)
- **PostgreSQL**: Database (port 5432)
- **Redis**: Cache and queue (port 6379)
- **MailHog**: Email testing (ports 1025, 8025)
- **SDK Builder**: Background build process

### Resources

#### Development
- API: 1 replica
- Database: 10Gi storage
- Redis: 2Gi storage

#### Production
- API: 3 replicas
- Database: 50Gi storage
- Redis: 5Gi storage

## Monitoring

```bash
# Check pods
kubectl get pods -n telepaygate

# Check services
kubectl get svc -n telepaygate

# View logs
kubectl logs -l app=telepaygate -n telepaygate -f

# Check ingress
kubectl get ingress -n telepaygate
```

## Troubleshooting

### Pods Not Starting

```bash
kubectl describe pod <pod-name> -n telepaygate
kubectl logs <pod-name> -n telepaygate
```

### Database Issues

```bash
kubectl exec -it <db-pod> -n telepaygate -- psql -U tg_user -d telepaygate_dev
```

### Redis Issues

```bash
kubectl exec -it <redis-pod> -n telepaygate -- redis-cli ping
```

## Scaling

```bash
# Scale API
kubectl scale deployment api --replicas=3 -n telepaygate

# Enable HPA
kubectl autoscale deployment api --cpu-percent=70 --min=2 --max=10 -n telepaygate
```

## Cleanup

```bash
kubectl delete -k bridge/base
# or
kubectl delete namespace telepaygate
```

## Documentation

For detailed information, see [`bridge/README.md`](../bridge/README.md).
