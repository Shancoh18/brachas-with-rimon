#!/bin/bash
# deploy-railway.sh — Brachas with Rimon API on Railway.
# Mirrors group-app-cloud/deploy-railway.sh (same project, new service).
# Prereq: RAILWAY_API_TOKEN in group-app-ad/.env (already present).
set -euo pipefail
# Git-Bash mangles leading-slash args (DATA_DIR=/data became a Windows path
# and silently pointed the server at ephemeral storage) — disable conversion.
export MSYS_NO_PATHCONV=1 MSYS2_ARG_CONV_EXCL="*"

PROJECT_ID="331f49c9-5435-4e1a-9a23-5dbe56924910"
SERVICE_NAME="brachas-rimon-api"
DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$DIR/../../group-app-ad/.env"

getenvvar() { grep -m1 "^$1=" "$ENV_FILE" 2>/dev/null | cut -d= -f2- | tr -d '"' || true; }
TOKEN="${RAILWAY_API_TOKEN:-$(getenvvar RAILWAY_API_TOKEN)}"
[ -z "$TOKEN" ] && { echo "✗ RAILWAY_API_TOKEN missing"; exit 2; }

unset RAILWAY_TOKEN
export RAILWAY_API_TOKEN="$TOKEN"
RW="npx --yes @railway/cli@latest"

cd "$DIR"
echo "→ linking project"
$RW link --project "$PROJECT_ID" --environment production 2>/dev/null || $RW link --project "$PROJECT_ID" || true

echo "→ ensuring service '$SERVICE_NAME'"
$RW add --service "$SERVICE_NAME" 2>/dev/null || echo "  (service exists)"

echo "→ ensuring volume at /data"
$RW service "$SERVICE_NAME" >/dev/null 2>&1 || true
$RW volume add -m /data 2>/dev/null || echo "  (volume exists)"

echo "→ variables"
$RW variable set DATA_DIR=/data --service "$SERVICE_NAME" --skip-deploys >/dev/null 2>&1 || \
  $RW variables --set "DATA_DIR=/data" --service "$SERVICE_NAME" --skip-deploys >/dev/null

# ANTHROPIC_API_KEY is set separately when the user provides one:
#   npx @railway/cli variables --set "ANTHROPIC_API_KEY=sk-..." --service brachas-rimon-api

echo "→ deploying code"
$RW up --service "$SERVICE_NAME" --detach

echo "→ public domain"
$RW domain --service "$SERVICE_NAME" 2>/dev/null || true
echo "done"
