````markdown
# Contributing

## Running optional e2e (fixture-backed) tests

Some integration tests can be executed against a disposable Postgres instance using Testcontainers (Docker). These are opt-in and should only be run when Docker is available locally or on a self-hosted runner.

Prerequisites
- Docker must be installed and running on the host.
- Node.js 20+ and project dependencies installed (`npm ci`).

How to run locally

```bash
# Run a single fixture-backed test (example)
USE_TESTCONTAINERS=true npm --workspace=@tg-payment/api run test -- src/__tests__/auth.magic-link.test.ts -i
```

CI
- A GitHub Actions job `e2e-fixture` exists in `.github/workflows/ci.yml`. It is intended to run on a self-hosted runner that has Docker installed and is labeled `self-hosted`, `linux`, and `docker`.
- To add a self-hosted runner:
  1. Create a machine (VM, DigitalOcean droplet, or similar) with Docker installed.
  2. Follow GitHub's instructions to add a self-hosted runner to the repository or organization: https://docs.github.com/en/actions/hosting-your-own-runners
  3. Add labels to the runner: `self-hosted`, `linux`, `docker`.
  4. Ensure the runner user has permission to run Docker and has sufficient resources (2+ CPUs, 4GB+ RAM recommended).

Triggering the e2e job
- The `e2e-fixture` job is currently configured to run manually via `workflow_dispatch`. A maintainer can trigger it from the Actions UI on GitHub.

Self-hosted runner bootstrap script

We provide a convenience script to bootstrap an Ubuntu VM as a self-hosted runner and register it with this repository. It will install Docker and the runner, and register the runner using a token you obtain from GitHub.

Usage example (run on the target VM):

```bash
# On your VM, set these environment variables and run the script
REPO_URL="https://github.com/<owner>/<repo>" \
RUNNER_TOKEN="<token-from-github>" \
RUNNER_LABELS="self-hosted,linux,docker" \
  ./scripts/setup-self-hosted-runner.sh
```

Notes:
- Obtain `RUNNER_TOKEN` from GitHub: Repository Settings → Actions → Runners → New self-hosted runner → Generate token.
- The script installs Docker and configures the runner as a systemd service.
- Ensure the VM has at least 2 CPUs and 4GB memory for reliable e2e runs.

Security
- Tests may set `EXPOSE_TEST_TOKENS=true` which causes controllers to include raw magic tokens in JSON responses for deterministic testing. Do not enable this flag in public CI logs or production.

Contact
- For questions about running fixture-backed tests in CI, reach out to the repository maintainers or open an issue.

````
