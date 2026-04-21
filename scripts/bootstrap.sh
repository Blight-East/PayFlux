#!/usr/bin/env bash
set -euo pipefail

########################################
# PAYFLUX PRODUCTION BOOTSTRAP
########################################

APP=payflux
USER_HOME=$(eval echo "~$USER")
INSTALL_DIR="$USER_HOME/$APP"
ENV_FILE="$INSTALL_DIR/deploy/.env"

echo "=== PAYFLUX SERVER BOOTSTRAP START ==="

fail() { echo "❌ $1"; exit 1; }
step() { echo -e "\n▶ $1"; }

########################################
step "1. System Update"
sudo apt update -y && sudo apt upgrade -y || fail "apt update failed"

########################################
step "2. Install Dependencies"
sudo apt install -y \
  curl \
  git \
  ufw \
  ca-certificates \
  gnupg \
  lsb-release || fail "package install failed"

########################################
step "3. Install Docker Engine"
if ! command -v docker >/dev/null; then
  curl -fsSL https://get.docker.com | sh || fail "docker install failed"
  sudo usermod -aG docker "$USER"
fi

########################################
step "4. Configure Firewall"
sudo ufw allow OpenSSH >/dev/null
sudo ufw allow 8080/tcp >/dev/null
sudo ufw --force enable >/dev/null

########################################
step "5. Clone Repo"
[ -d "$INSTALL_DIR" ] || git clone https://github.com/YOUR_REPO/payment-node.git "$INSTALL_DIR" \
  || fail "git clone failed"

cd "$INSTALL_DIR"

########################################
step "6. Environment Setup"
mkdir -p deploy

if [ ! -f "$ENV_FILE" ]; then
cat <<EOF > "$ENV_FILE"
REDIS_ADDR=redis:6379
PAYFLUX_SIGNAL_OVERRIDES_ENABLED=false
PAYFLUX_ENV=prod
EOF
fi

########################################
step "7. Build + Deploy"
chmod +x scripts/*.sh

bash scripts/prod-deploy.sh || fail "deploy failed"

########################################
step "8. Health Check"
sleep 3
curl -fs http://localhost:8080/health >/dev/null \
  || fail "health check failed"

########################################
step "9. Install Global Deploy Command"
grep -q "alias deploy" ~/.bashrc || echo 'alias deploy="cd ~/'"$APP"' && bash scripts/prod-deploy.sh"' >> ~/.bashrc

########################################
echo ""
echo "======================================"
echo "✅ SERVER READY"
echo "Service: http://$(curl -s ifconfig.me):8080"
echo "Deploy command: deploy"
echo "======================================"
