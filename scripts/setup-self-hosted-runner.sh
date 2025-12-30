#!/usr/bin/env bash
set -euo pipefail

# Usage: ./scripts/setup-self-hosted-runner.sh <GITHUB_RUNNER_URL> <GITHUB_RUNNER_TOKEN> [runner_name]
# Example:
#   ./scripts/setup-self-hosted-runner.sh https://github.com/owner/repo ghp_xxx my-runner-01

GITHUB_URL=${1:-}
GITHUB_TOKEN=${2:-}
RUNNER_NAME=${3:-$(hostname)-runner}

if [ -z "$GITHUB_URL" ] || [ -z "$GITHUB_TOKEN" ]; then
  echo "Usage: $0 <GITHUB_RUNNER_URL> <GITHUB_RUNNER_TOKEN> [runner_name]"
  exit 1
fi

ARCH=$(uname -m)
if [ "$ARCH" = "x86_64" ]; then
  RUNNER_ARCH="x64"
else
  RUNNER_ARCH="arm64"
fi

WORKDIR="/opt/github-runner"
mkdir -p "$WORKDIR"
cd "$WORKDIR"

echo "Downloading GitHub Actions runner..."
RUNNER_TGZ="actions-runner-linux-$RUNNER_ARCH-2.300.2.tar.gz"
curl -fsSL -o "$RUNNER_TGZ" "https://github.com/actions/runner/releases/download/v2.300.2/$RUNNER_TGZ"
tar xzf "$RUNNER_TGZ"

echo "Configuring runner as $RUNNER_NAME"
./config.sh --url "$GITHUB_URL" --token "$GITHUB_TOKEN" --name "$RUNNER_NAME" --labels "self-hosted,linux,docker" --unattended

echo "Creating systemd service file..."
sudo tee /etc/systemd/system/github-runner.service > /dev/null <<'SERVICE'
[Unit]
Description=GitHub Actions Runner
After=network.target

[Service]
Type=simple
User=$(whoami)
WorkingDirectory=/opt/github-runner
ExecStart=/opt/github-runner/run.sh
Restart=always

[Install]
WantedBy=multi-user.target
SERVICE

echo "Reloading systemd and enabling runner"
sudo systemctl daemon-reload
sudo systemctl enable --now github-runner.service

echo "Runner setup complete. Check 'systemctl status github-runner' and the Actions UI."
#!/usr/bin/env bash
set -euo pipefail

# Usage:
#  RUNNER_URL=https://github.com/<owner>/<repo> RUNNER_TOKEN=<token> ./scripts/setup-self-hosted-runner.sh
# You can obtain a runner token from the repo's Settings -> Actions -> Runners -> New self-hosted runner

REPO_URL=${REPO_URL:-${RUNNER_URL:-}}
RUNNER_TOKEN=${RUNNER_TOKEN:-}
RUNNER_LABELS=${RUNNER_LABELS:-"self-hosted,linux,docker"}
WORK_DIR=${WORK_DIR:-/opt/actions-runner}

if [ -z "$REPO_URL" ] || [ -z "$RUNNER_TOKEN" ]; then
  echo "REPO_URL and RUNNER_TOKEN must be set. Example:"
  echo "  REPO_URL=https://github.com/OWNER/REPO RUNNER_TOKEN=xxxx ./scripts/setup-self-hosted-runner.sh"
  exit 1
fi

echo "Installing prerequisites..."
sudo apt-get update
sudo apt-get install -y libicu-dev curl jq git docker.io
sudo systemctl enable --now docker

echo "Creating runner directory: $WORK_DIR"
sudo mkdir -p "$WORK_DIR"
sudo chown "$USER":"$USER" "$WORK_DIR"
pushd "$WORK_DIR"

ARCHIVE_URL="https://github.com/actions/runner/releases/latest/download/actions-runner-linux-x64-$(uname -m).tar.gz"
echo "Downloading runner from $ARCHIVE_URL"
curl -sSL "$ARCHIVE_URL" -o actions-runner.tar.gz
tar xzf actions-runner.tar.gz

echo "Configuring runner for $REPO_URL"
./config.sh --unattended --url "$REPO_URL" --token "$RUNNER_TOKEN" --labels "$RUNNER_LABELS"

echo "Installing runner service (systemd)"
sudo ./svc.sh install
sudo ./svc.sh start

echo "Runner installed and started. To reconfigure or remove run ./config.sh remove"
popd
