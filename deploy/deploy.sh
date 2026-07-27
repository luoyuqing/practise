#!/bin/bash
# MuseAI deployment script for server 1.14.73.64
# Run from local machine: bash deploy/deploy.sh

set -e

SERVER_IP="1.14.73.64"
SSH_USER="ubuntu"
SSH_KEY="D:/AI/miyao1.pem"
REMOTE_DIR="/home/ubuntu/MuseAI"

echo "=== MuseAI Deployment ==="
echo "Target: $SSH_USER@$SERVER_IP:$REMOTE_DIR"

# 1. Sync server directory
echo "[1/5] Syncing server/ directory..."
scp -i "$SSH_KEY" -r server/ "$SSH_USER@$SERVER_IP:$REMOTE_DIR/server/"

# 2. Sync dist directory (built frontend)
echo "[2/5] Syncing dist/ directory..."
scp -i "$SSH_KEY" -r dist/ "$SSH_USER@$SERVER_IP:$REMOTE_DIR/dist/"

# 3. Install dependencies on server
echo "[3/5] Installing Node.js dependencies on server..."
ssh -i "$SSH_KEY" "$SSH_USER@$SERVER_IP" "cd $REMOTE_DIR/server && npm install --production"

# 4. Install systemd service
echo "[4/5] Installing systemd service..."
scp -i "$SSH_KEY" deploy/museai.service "$SSH_USER@$SERVER_IP:/tmp/museai.service"
ssh -i "$SSH_KEY" "$SSH_USER@$SERVER_IP" "sudo mv /tmp/museai.service /etc/systemd/system/museai.service && sudo systemctl daemon-reload && sudo systemctl enable museai"

# 5. Install Nginx config and restart
echo "[5/5] Installing Nginx config..."
scp -i "$SSH_KEY" deploy/museai.conf "$SSH_USER@$SERVER_IP:/tmp/museai.conf"
ssh -i "$SSH_KEY" "$SSH_USER@$SERVER_IP" "sudo mv /tmp/museai.conf /etc/nginx/sites-available/museai.conf && sudo ln -sf /etc/nginx/sites-available/museai.conf /etc/nginx/sites-enabled/museai.conf && sudo nginx -t && sudo systemctl reload nginx"

# 6. Start service
echo "Starting MuseAI service..."
ssh -i "$SSH_KEY" "$SSH_USER@$SERVER_IP" "sudo systemctl restart museai && sleep 2 && sudo systemctl status museai --no-pager"

echo ""
echo "=== Deployment Complete ==="
echo "App: http://museai.3585616.xyz (will need Cloudflare DNS A record)"
echo "Service: sudo systemctl status museai"
echo "Logs: sudo journalctl -u museai -f"