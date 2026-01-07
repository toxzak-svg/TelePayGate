#!/bin/bash

# TelePayGate Kubernetes Deployment Script
# This script automates the deployment of TelePayGate to Kubernetes

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE="telepaygate"
DEPLOYMENT_TYPE="${1:-dev}"  # dev, prod, or desktop
REGISTRY="${2:-your-registry}"
IMAGE_TAG="${3:-latest}"

# Functions
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_prerequisites() {
    print_info "Checking prerequisites..."
    
    # Check kubectl
    if ! command -v kubectl &> /dev/null; then
        print_error "kubectl is not installed. Please install kubectl first."
        exit 1
    fi
    
    # Check kustomize
    if ! command -v kustomize &> /dev/null; then
        print_error "kustomize is not installed. Please install kustomize first."
        exit 1
    fi
    
    # Check docker
    if ! command -v docker &> /dev/null; then
        print_error "docker is not installed. Please install docker first."
        exit 1
    fi
    
    # Check cluster connection
    if ! kubectl cluster-info &> /dev/null; then
        print_error "Cannot connect to Kubernetes cluster. Please check your kubeconfig."
        exit 1
    fi
    
    print_info "All prerequisites are met."
}

build_image() {
    print_info "Building Docker image..."
    
    # Build the image
    docker build -t telepaygate-api:${IMAGE_TAG} .
    
    # Tag for registry
    docker tag telepaygate-api:${IMAGE_TAG} ${REGISTRY}/telepaygate-api:${IMAGE_TAG}
    
    print_info "Docker image built successfully."
}

push_image() {
    print_info "Pushing Docker image to registry..."
    
    # Push to registry
    docker push ${REGISTRY}/telepaygate-api:${IMAGE_TAG}
    
    print_info "Docker image pushed successfully."
}

update_image_reference() {
    print_info "Updating image reference in Kustomization..."
    
    # Determine which kustomization to update
    if [ "$DEPLOYMENT_TYPE" = "prod" ]; then
        KUSTOMIZATION_FILE="bridge/overlays/production/kustomization.yaml"
    elif [ "$DEPLOYMENT_TYPE" = "desktop" ]; then
        KUSTOMIZATION_FILE="bridge/overlays/desktop/kustomization.yaml"
    else
        KUSTOMIZATION_FILE="bridge/base/kustomization.yaml"
    fi
    
    # Update image reference
    sed -i.bak "s|newName:.*telepaygate-api|newName: ${REGISTRY}/telepaygate-api|g" "$KUSTOMIZATION_FILE"
    sed -i.bak "s|newTag:.*|newTag: ${IMAGE_TAG}|g" "$KUSTOMIZATION_FILE"
    
    # Remove backup file
    rm -f "${KUSTOMIZATION_FILE}.bak"
    
    print_info "Image reference updated in $KUSTOMIZATION_FILE"
}

check_secrets() {
    print_info "Checking secrets configuration..."
    
    SECRET_FILE="bridge/base/secret.yaml"
    
    if [ ! -f "$SECRET_FILE" ]; then
        print_error "Secret file not found: $SECRET_FILE"
        exit 1
    fi
    
    # Check if secrets contain placeholder values
    if grep -q "your_.*_here" "$SECRET_FILE"; then
        print_warning "Secret file contains placeholder values. Please update them before deploying to production."
        
        if [ "$DEPLOYMENT_TYPE" = "prod" ]; then
            print_error "Cannot deploy to production with placeholder secrets."
            exit 1
        fi
    fi
    
    print_info "Secrets configuration checked."
}

deploy() {
    print_info "Deploying TelePayGate to Kubernetes (Type: $DEPLOYMENT_TYPE)..."
    
    # Determine which overlay to use
    if [ "$DEPLOYMENT_TYPE" = "prod" ]; then
        KUSTOMIZATION_PATH="bridge/overlays/production"
    elif [ "$DEPLOYMENT_TYPE" = "desktop" ]; then
        KUSTOMIZATION_PATH="bridge/overlays/desktop"
    else
        KUSTOMIZATION_PATH="bridge/base"
    fi
    
    # Apply the manifests
    kubectl apply -k "$KUSTOMIZATION_PATH"
    
    print_info "Deployment initiated."
}

wait_for_pods() {
    print_info "Waiting for pods to be ready..."
    
    # Wait for namespace to be created
    kubectl wait --for=condition=ready pod -l app=telepaygate -n "$NAMESPACE" --timeout=300s || true
    
    # Check pod status
    print_info "Checking pod status..."
    kubectl get pods -n "$NAMESPACE"
}

show_status() {
    print_info "Deployment status:"
    
    echo ""
    echo "Pods:"
    kubectl get pods -n "$NAMESPACE"
    
    echo ""
    echo "Services:"
    kubectl get svc -n "$NAMESPACE"
    
    echo ""
    echo "Ingress:"
    kubectl get ingress -n "$NAMESPACE" || echo "No ingress configured"
    
    echo ""
    echo "Persistent Volume Claims:"
    kubectl get pvc -n "$NAMESPACE"
}

show_access_info() {
    print_info "Access Information:"
    
    echo ""
    echo "To access the application:"
    echo ""
    
    if [ "$DEPLOYMENT_TYPE" = "prod" ]; then
        echo "Production:"
        echo "  API: https://api.yourdomain.com"
        echo "  MailHog: https://mailhog.yourdomain.com"
    else
        echo "Development/Local:"
        echo "  Forward API port:"
        echo "    kubectl port-forward -n $NAMESPACE svc/api 3000:3000"
        echo "  Then access at: http://localhost:3000"
        echo ""
        echo "  Forward MailHog UI:"
        echo "    kubectl port-forward -n $NAMESPACE svc/mailhog 8025:8025"
        echo "  Then access at: http://localhost:8025"
    fi
    
    echo ""
    echo "To view logs:"
    echo "  kubectl logs -l app=telepaygate -n $NAMESPACE --all-containers=true -f"
    echo ""
}

# Main execution
main() {
    print_info "TelePayGate Kubernetes Deployment Script"
    print_info "========================================"
    echo ""
    
    # Parse arguments
    case "$1" in
        --help|-h)
            echo "Usage: $0 [dev|prod|desktop] [registry] [image-tag]"
            echo ""
            echo "Arguments:"
            echo "  dev         Deploy to development environment (default)"
            echo "  prod        Deploy to production environment"
            echo "  desktop     Deploy to desktop environment"
            echo "  registry    Container registry (default: your-registry)"
            echo "  image-tag   Image tag (default: latest)"
            echo ""
            echo "Examples:"
            echo "  $0 dev"
            echo "  $0 prod my-registry.com v1.0.0"
            echo "  $0 desktop"
            exit 0
            ;;
    esac
    
    # Check prerequisites
    check_prerequisites
    
    # Build image
    build_image
    
    # Push image
    push_image
    
    # Update image reference
    update_image_reference
    
    # Check secrets
    check_secrets
    
    # Deploy
    deploy
    
    # Wait for pods
    wait_for_pods
    
    # Show status
    show_status
    
    # Show access info
    show_access_info
    
    print_info "Deployment completed successfully!"
}

# Run main function
main "$@"
