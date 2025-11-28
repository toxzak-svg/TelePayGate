# Deployment Guide

This guide explains how to deploy the Telegram Payment Gateway to production environments (Render, Railway, Docker, etc.).

## Prerequisites
- Node.js 20+
- PostgreSQL 16+
- Docker & Docker Compose
- Environment variables configured (see RENDER_ENV_SETUP.md)

## Steps
1. Clone the repository
2. Install dependencies: `npm install`
3. Run database migrations: `npm run migrate`
4. Build the project: `npm run build --workspaces`
5. Start services: `docker-compose up -d` or `npm run dev`

### Docker - local / development

There is a short developer guide covering local Docker usage, `docker-compose` best practices for this repository, and a development override that mounts your working copy into the containers for live reload: see `docs/DOCKER.md`.
6. Verify API and dashboard are running

## Production Checklist
- SSL certificates
- Database backups
- Monitoring & alerting
- Environment variable validation
- CI/CD pipeline

For Render-specific steps, see DEPLOYMENT_RENDER.md.
