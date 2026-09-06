#!/bin/bash
# setup-backups.sh — one-shot activation of off-volume encrypted DB backups.
# Run BY THE OPERATOR (credential handling is deliberately not automated):
#   bash "D:/Claude GROUP APP/bracha-app/server/setup-backups.sh"
#
# What it does:
#   1. generates a fresh 32-byte AES key (BACKUP_KEY)
#   2. mirrors it to group-app-ad/.env as BRACHA_BACKUP_KEY (local recovery copy)
#   3. reuses your gh CLI token as BACKUP_TOKEN (swap for a fine-grained PAT
#      scoped to the backup repo later if you want tighter scope)
#   4. sets BACKUP_KEY / BACKUP_REPO / BACKUP_TOKEN on the Railway service
#      (this restarts it; backup.mjs then runs a backup at boot + daily)
set -euo pipefail

SERVICE="brachas-rimon-api"
REPO="Shancoh18/brachas-rimon-backups"
ENV_FILE="D:/Claude GROUP APP/group-app-ad/.env"

cd "$(dirname "$0")"

KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
TOKEN=$(gh auth token)
[ -z "$KEY" ] && { echo "✗ key generation failed"; exit 1; }
[ -z "$TOKEN" ] && { echo "✗ gh CLI has no token (run: gh auth login)"; exit 1; }

# local mirror FIRST — losing the key makes every backup undecryptable
if grep -q '^BRACHA_BACKUP_KEY=' "$ENV_FILE" 2>/dev/null; then
  echo "• BRACHA_BACKUP_KEY already in $ENV_FILE — keeping the existing key"
  KEY=$(grep -m1 '^BRACHA_BACKUP_KEY=' "$ENV_FILE" | cut -d= -f2-)
else
  echo "BRACHA_BACKUP_KEY=$KEY" >> "$ENV_FILE"
  echo "• key mirrored to $ENV_FILE (BRACHA_BACKUP_KEY) — also save it in a password manager"
fi

echo "• setting Railway variables (service restarts)…"
railway variables \
  --set "BACKUP_KEY=$KEY" \
  --set "BACKUP_REPO=$REPO" \
  --set "BACKUP_TOKEN=$TOKEN" \
  --service "$SERVICE" > /dev/null

echo "✓ done — the service is redeploying; the first encrypted backup lands in"
echo "  https://github.com/$REPO within a few minutes of boot."
