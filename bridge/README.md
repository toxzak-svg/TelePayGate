# TelePayGate Kubernetes Deployment Guide

This guide provides comprehensive instructions for deploying TelePayGate on a Kubernetes cluster using Kustomize.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Architecture Overview](#architecture-overview)
- [Directory Structure](#directory-structure)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Deployment](#deployment)
- [Scaling](#scaling)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)

## Prerequisites

Before deploying TelePayGate to Kubernetes, ensure you have:

- **Kubernetes Cluster**: A running Kubernetes cluster (v1.24+)
  - Local: Minikube, Kind, or Docker Desktop with Kubernetes enabled
  - Cloud: GKE, EKS, AKS, or any managed Kubernetes service

- **kubectl**: Kubernetes command-line tool installed and configured
  ```bash
  kubectl version --client
  ```

- **Kustomize**: For managing Kubernetes manifests (v4.0+)
  ```bash
  kustomize version
  ```

- **Docker**: For building container images
  ```bash
  docker --version
  ```

- **Container Registry**: Access to a container registry (Docker Hub, ECR, GCR, etc.)

- **Ingress Controller**: NGINX Ingress Controller installed (for production)
  ```bash
  kubectl get ingressclass
  ```

- **Storage Class**: A default StorageClass configured for PersistentVolumes
  ```bash
  kubectl get storageclass
  ```

## Architecture Overview

The TelePayGate Kubernetes deployment consists of the following components:

### Core Services

1. **API Service** ([`api-deployment.yaml`](base/api-deployment.yaml))
   - Main application server
   - Handles all HTTP requests and business logic
   - Replicas: 1 (dev) / 3 (prod)
   - Port: 3000

2. **PostgreSQL Database** ([`db-deployment.yaml`](base/db-deployment.yaml))
   - Primary data store
   - Persistent storage: 10Gi (dev) / 50Gi (prod)
   - Port: 5432

3. **Redis Cache** ([`redis-deployment.yaml`](base/redis-deployment.yaml))
   - Caching and job queue
   - Persistent storage: 2Gi (dev) / 5Gi (prod)
   - Port: 6379

4. **MailHog** ([`mailhog-deployment.yaml`](base/mailhog-deployment.yaml))
   - Email testing service (development only)
   - SMTP Port: 1025
   - Web UI Port: 8025

5. **SDK Builder** ([`sdk_builder-deployment.yaml`](base/sdk_builder-deployment.yaml))
   - Builds SDK packages
   - Runs as a background process

### Supporting Resources

- **ConfigMap** ([`configmap.yaml`](base/configmap.yaml)): Non-sensitive configuration
- **Secret** ([`secret.yaml`](base/secret.yaml)): Sensitive credentials and secrets
- **PersistentVolumeClaims**: Storage for database and Redis
- **Ingress** ([`ingress.yaml`](base/ingress.yaml)): External access routing
- **Services**: Internal service discovery
- **NetworkPolicy**: Traffic isolation and security

## Directory Structure

```
bridge/
├── base/                           # Base Kubernetes manifests
│   ├── 0-telepaygate-namespace.yaml
│   ├── configmap.yaml              # Non-sensitive configuration
│   ├── secret.yaml                 # Sensitive credentials
│   ├── pvc.yaml                    # Persistent volume claims
│   ├── api-deployment.yaml         # API deployment
│   ├── api-service.yaml            # API service
│   ├── api-expose.yaml             # API exposure
│   ├── db-deployment.yaml          # PostgreSQL deployment
│   ├── db-service.yaml             # Database service
│   ├── db-expose.yaml              # Database exposure
│   ├── redis-deployment.yaml       # Redis deployment
│   ├── redis-service.yaml          # Redis service
│   ├── redis-expose.yaml           # Redis exposure
│   ├── mailhog-deployment.yaml     # MailHog deployment
│   ├── mailhog-service.yaml        # MailHog service
│   ├── mailhog-expose.yaml         # MailHog exposure
│   ├── sdk_builder-deployment.yaml # SDK builder deployment
│   ├── sdk_builder-expose.yaml     # SDK builder exposure
│   ├── default-network-policy.yaml # Network security policy
│   ├── ingress.yaml                # Ingress configuration
│   └── kustomization.yaml          # Base Kustomization
├── overlays/
│   ├── desktop/                    # Desktop/development overlay
│   │   ├── kustomization.yaml
│   │   ├── api-service.yaml
│   │   ├── db-service.yaml
│   │   ├── mailhog-service.yaml
│   │   └── redis-service.yaml
│   └── production/                 # Production overlay
│       ├── kustomization.yaml
│       ├── configmap-patch.yaml
│       ├── api-deployment-patch.yaml
│       ├── db-deployment-patch.yaml
│       ├── redis-deployment-patch.yaml
│       └── ingress-patch.yaml
└── README.md                       # This file
```

## Quick Start

### 1. Build the Docker Image

First, build the TelePayGate API Docker image:

```bash
# Build the image
docker build -t telepaygate-api:latest .

# Tag for your registry (replace with your registry)
docker tag telepaygate-api:latest your-registry/telepaygate-api:latest

# Push to registry
docker push your-registry/telepaygate-api:latest
```

### 2. Configure Secrets

Edit the secret file with your actual values:

```bash
# Generate secure secrets
openssl rand -base64 32 > jwt_secret.txt
openssl rand -base64 32 > api_secret.txt
openssl rand -hex 32 > encryption_key.txt

# Update the secret file
nano bridge/base/secret.yaml
```

**Important**: Never commit the secret file with real credentials to version control!

### 3. Deploy to Development

Deploy using the base configuration:

```bash
# Apply the base manifests
kubectl apply -k bridge/base

# Wait for pods to be ready
kubectl wait --for=condition=ready pod -l app=telepaygate -n telepaygate --timeout=300s

# Check deployment status
kubectl get all -n telepaygate
```

### 4. Access the Application

For local development with port-forwarding:

```bash
# Forward API port
kubectl port-forward -n telepaygate svc/api 3000:3000

# Forward MailHog UI
kubectl port-forward -n telepaygate svc/mailhog 8025:8025
```

Access the application at:
- API: http://localhost:3000
- MailHog: http://localhost:8025

## Configuration

### Environment Variables

Configuration is managed through ConfigMaps and Secrets:

#### ConfigMap ([`configmap.yaml`](base/configmap.yaml))

Contains non-sensitive configuration:
- Server settings (NODE_ENV, PORT, API_URL)
- Database connection parameters
- Redis configuration
- Feature flags
- Logging settings

#### Secret ([`secret.yaml`](base/secret.yaml))

Contains sensitive data:
- Database credentials
- API keys (Telegram, TON, etc.)
- JWT secrets
- Encryption keys
- SMTP credentials

### Updating Configuration

To update configuration without redeploying:

```bash
# Update ConfigMap
kubectl edit configmap telepaygate-config -n telepaygate

# Update Secret
kubectl edit secret telepaygate-secret -n telepaygate

# Restart pods to apply changes
kubectl rollout restart deployment api -n telepaygate
```

### Production Configuration

For production, use the production overlay:

```bash
# Edit production-specific configuration
nano bridge/overlays/production/configmap-patch.yaml

# Update production secrets
nano bridge/overlays/production/secret-patch.yaml

# Update ingress hosts
nano bridge/overlays/production/ingress-patch.yaml

# Update image registry
nano bridge/overlays/production/kustomization.yaml
```

## Deployment

### Development Deployment

Deploy using the base configuration:

```bash
kubectl apply -k bridge/base
```

### Production Deployment

Deploy using the production overlay:

```bash
kubectl apply -k bridge/overlays/production
```

### Desktop/Local Deployment

Deploy using the desktop overlay:

```bash
kubectl apply -k bridge/overlays/desktop
```

### Rolling Updates

To update the application:

```bash
# Build and push new image
docker build -t telepaygate-api:v1.0.1 .
docker push your-registry/telepaygate-api:v1.0.1

# Update the image in the deployment
kubectl set image deployment/api telepaygate-api=your-registry/telepaygate-api:v1.0.1 -n telepaygate

# Or use Kustomize to update
kubectl apply -k bridge/overlays/production
```

### Rollback

To rollback to a previous version:

```bash
# View rollout history
kubectl rollout history deployment/api -n telepaygate

# Rollback to previous version
kubectl rollout undo deployment/api -n telepaygate

# Rollback to specific revision
kubectl rollout undo deployment/api --to-revision=2 -n telepaygate
```

## Scaling

### Horizontal Scaling

Scale the API deployment:

```bash
# Scale to 3 replicas
kubectl scale deployment api --replicas=3 -n telepaygate

# Or update the deployment
kubectl edit deployment api -n telepaygate
```

### Vertical Scaling

Adjust resource limits:

```bash
# Edit deployment resources
kubectl edit deployment api -n telepaygate
```

Example resource configuration:

```yaml
resources:
  requests:
    memory: "512Mi"
    cpu: "250m"
  limits:
    memory: "1Gi"
    cpu: "1000m"
```

### Auto-scaling

Enable Horizontal Pod Autoscaler:

```bash
# Create HPA
kubectl autoscale deployment api \
  --cpu-percent=70 \
  --min=2 \
  --max=10 \
  -n telepaygate

# Check HPA status
kubectl get hpa -n telepaygate
```

## Monitoring

### Checking Pod Status

```bash
# List all pods
kubectl get pods -n telepaygate

# Get detailed pod information
kubectl describe pod <pod-name> -n telepaygate

# View pod logs
kubectl logs <pod-name> -n telepaygate

# Follow logs in real-time
kubectl logs -f <pod-name> -n telepaygate

# View logs for all pods in a deployment
kubectl logs -l app=telepaygate -n telepaygate --all-containers=true
```

### Checking Services

```bash
# List all services
kubectl get svc -n telepaygate

# Get service details
kubectl describe svc api -n telepaygate

# Test service connectivity
kubectl run -it --rm debug --image=curlimages/curl --restart=Never -- curl http://api:3000/health -n telepaygate
```

### Checking Persistent Volumes

```bash
# List PVCs
kubectl get pvc -n telepaygate

# Get PVC details
kubectl describe pvc postgres-pvc -n telepaygate

# List PVs
kubectl get pv
```

### Checking Ingress

```bash
# List ingress resources
kubectl get ingress -n telepaygate

# Get ingress details
kubectl describe ingress telepaygate-ingress -n telepaygate
```

## Troubleshooting

### Common Issues

#### Pods Not Starting

```bash
# Check pod status
kubectl get pods -n telepaygate

# Describe pod for events
kubectl describe pod <pod-name> -n telepaygate

# View pod logs
kubectl logs <pod-name> -n telepaygate
```

#### Database Connection Issues

```bash
# Check database pod
kubectl get pods -l com.docker.compose.service=db -n telepaygate

# Test database connection
kubectl exec -it <db-pod-name> -n telepaygate -- psql -U tg_user -d telepaygate_dev

# Check PVC
kubectl get pvc postgres-pvc -n telepaygate
```

#### Redis Connection Issues

```bash
# Check Redis pod
kubectl get pods -l com.docker.compose.service=redis -n telepaygate

# Test Redis connection
kubectl exec -it <redis-pod-name> -n telepaygate -- redis-cli ping

# Check Redis logs
kubectl logs <redis-pod-name> -n telepaygate
```

#### Image Pull Errors

```bash
# Check image pull policy
kubectl describe pod <pod-name> -n telepaygate

# Verify image exists
docker pull your-registry/telepaygate-api:latest

# Create image pull secret if using private registry
kubectl create secret docker-registry regcred \
  --docker-server=your-registry \
  --docker-username=your-username \
  --docker-password=your-password \
  -n telepaygate
```

#### Ingress Not Working

```bash
# Check ingress controller
kubectl get pods -n ingress-nginx

# Check ingress resource
kubectl get ingress -n telepaygate

# Test ingress locally (if using port-forward)
kubectl port-forward -n ingress-nginx svc/ingress-nginx-controller 8080:80
```

### Debugging

#### Exec into a Pod

```bash
# Execute into API pod
kubectl exec -it <api-pod-name> -n telepaygate -- /bin/sh

# Execute into database pod
kubectl exec -it <db-pod-name> -n telepaygate -- psql -U tg_user -d telepaygate_dev
```

#### Port Forwarding

```bash
# Forward API port
kubectl port-forward -n telepaygate svc/api 3000:3000

# Forward database port
kubectl port-forward -n telepaygate svc/db 5432:5432

# Forward Redis port
kubectl port-forward -n telepaygate svc/redis 6379:6379
```

#### Network Policies

```bash
# List network policies
kubectl get networkpolicy -n telepaygate

# Describe network policy
kubectl describe networkpolicy default -n telepaygate
```

### Cleanup

To remove the entire deployment:

```bash
# Delete all resources
kubectl delete -k bridge/base

# Or delete namespace
kubectl delete namespace telepaygate
```

## Security Best Practices

1. **Never commit secrets**: Use environment-specific secrets and never commit them to version control
2. **Use RBAC**: Implement Role-Based Access Control for cluster access
3. **Network policies**: Restrict pod-to-pod communication
4. **Image scanning**: Scan container images for vulnerabilities
5. **Resource limits**: Set appropriate resource requests and limits
6. **TLS encryption**: Enable TLS for all external communications
7. **Regular updates**: Keep Kubernetes and dependencies updated
8. **Audit logging**: Enable audit logging for security events

## Additional Resources

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Kustomize Documentation](https://kustomize.io/)
- [NGINX Ingress Controller](https://kubernetes.github.io/ingress-nginx/)
- [PostgreSQL on Kubernetes](https://www.postgresql.org/docs/current/admin-pg-hba-conf.html)
- [Redis on Kubernetes](https://redis.io/docs/management/scaling/)

## Support

For issues or questions:
- Check the [TelePayGate Documentation](../../docs/)
- Open an issue on GitHub
- Contact the TelePayGate team
