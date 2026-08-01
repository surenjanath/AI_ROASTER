#!/usr/bin/env bash
# ============================================================
#  AI_ROASTER — start backend + Expo frontend
#
#  Usage:
#    ./start.sh                   (LAN mode — same WiFi as phone)
#    ./start.sh --tunnel          (tunnel mode — works over any network)
#    ./start.sh --port 9000       (custom backend port)
#    ./start.sh --fast            (use llama3.2:1b for both models, fastest)
#
#  iPhone testing:
#    1. Install "Expo Go" from the App Store
#    2. Make sure phone is on the SAME WiFi network (LAN mode)
#       OR use --tunnel for any network
#    3. Scan the QR code that appears in this terminal
#       OR open Expo Go → Enter URL → exp://192.168.x.x:8081
# ============================================================
set -euo pipefail

BACKEND_PORT=8001
EXPO_FLAG="--lan"
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"
FAST_MODE=0

# ---- parse flags ----
while [[ $# -gt 0 ]]; do
  case "$1" in
    --port)    BACKEND_PORT="$2"; shift 2 ;;
    --tunnel)  EXPO_FLAG="--tunnel"; shift ;;
    --lan)     EXPO_FLAG="--lan"; shift ;;
    --fast)    FAST_MODE=1; shift ;;
    *) echo "Unknown flag: $1"; exit 1 ;;
  esac
done

# ---- detect local IP ----
LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null \
  || ipconfig getifaddr en1 2>/dev/null \
  || ifconfig 2>/dev/null | awk '/inet /{print $2}' | grep -v 127 | head -1 \
  || echo "localhost")
BACKEND_URL="http://${LOCAL_IP}:${BACKEND_PORT}"

echo ""
echo "  ╔══════════════════════════════════════════╗"
echo "  ║           AI ROASTER — STARTUP           ║"
echo "  ╚══════════════════════════════════════════╝"
echo ""
echo "  Mac IP     : $LOCAL_IP"
echo "  Backend    : $BACKEND_URL"
echo "  Expo mode  : $EXPO_FLAG"
[[ $FAST_MODE -eq 1 ]] && echo "  LLM mode   : FAST (llama3.2:1b)"
echo ""

# ---- write frontend .env ----
echo "EXPO_PUBLIC_BACKEND_URL=${BACKEND_URL}" > "$FRONTEND_DIR/.env"

# ---- check MongoDB ----
echo "▶  Checking MongoDB..."
if ! nc -z localhost 27017 2>/dev/null; then
  echo "  MongoDB not running. Starting via brew services..."
  brew services start mongodb/brew/mongodb-community 2>/dev/null || \
    brew services start mongodb-community 2>/dev/null || true
  sleep 3
fi
nc -z localhost 27017 2>/dev/null && echo "  ✓ MongoDB on :27017" || { echo "  ✗ MongoDB not reachable"; exit 1; }

# ---- check Ollama ----
echo "▶  Checking Ollama..."
if ! curl -sf http://localhost:11434/api/tags >/dev/null 2>&1; then
  echo "  Ollama not running. Starting..."
  ollama serve &>/dev/null &
  sleep 4
fi
curl -sf http://localhost:11434/api/tags >/dev/null 2>&1 && echo "  ✓ Ollama on :11434" || { echo "  ✗ Ollama not reachable. Run: ollama serve"; exit 1; }

# ---- fast mode: switch to llama3.2:1b ----
if [[ $FAST_MODE -eq 1 ]]; then
  curl -sf -X PUT http://localhost:${BACKEND_PORT}/api/settings \
    -H "Content-Type: application/json" \
    -d '{"ollama_primary_model":"llama3.2:1b","ollama_secondary_model":"llama3.2:1b"}' \
    >/dev/null 2>&1 || true
fi

# ---- check Python deps ----
echo "▶  Checking backend Python deps..."
python3 -c "import fastapi, uvicorn, motor, httpx, dotenv, pydantic, litellm" 2>/dev/null \
  || { echo "  Installing..."; pip3 install fastapi uvicorn motor httpx python-dotenv pydantic litellm; }
echo "  ✓ Python deps OK"

# ---- check node_modules ----
echo "▶  Checking frontend deps..."
if [ ! -f "$FRONTEND_DIR/node_modules/.bin/expo" ]; then
  echo "  Installing node_modules (takes a few minutes)..."
  cd "$FRONTEND_DIR"
  yarn install --ignore-scripts 2>&1 | tail -3
fi
echo "  ✓ Frontend deps OK"

# ---- cleanup on exit ----
cleanup() {
  echo ""
  echo "⏹  Shutting down..."
  kill "$BACKEND_PID" 2>/dev/null || true
  kill "$FRONTEND_PID" 2>/dev/null || true
  wait "$BACKEND_PID" 2>/dev/null || true
  wait "$FRONTEND_PID" 2>/dev/null || true
  echo "  Done."
}
trap cleanup EXIT INT TERM

# ---- start backend ----
echo ""
echo "▶  Starting backend on :${BACKEND_PORT}..."
cd "$BACKEND_DIR"
python3 -m uvicorn server:app \
  --host 0.0.0.0 \
  --port "$BACKEND_PORT" \
  --log-level warning &
BACKEND_PID=$!

echo "  Waiting for backend..."
for i in $(seq 1 20); do
  if curl -sf "http://localhost:${BACKEND_PORT}/api/" >/dev/null 2>&1; then
    echo "  ✓ Backend is up"
    break
  fi
  sleep 1
done

# ---- auto-seed if no agents ----
AGENT_COUNT=$(curl -s "http://localhost:${BACKEND_PORT}/api/agents" 2>/dev/null \
  | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "0")
if [[ "$AGENT_COUNT" -lt 4 ]]; then
  echo "  Seeding initial agents with Ollama (30-90s)..."
  curl -sf -X POST "http://localhost:${BACKEND_PORT}/api/seed" >/dev/null 2>&1 && \
    echo "  ✓ Agents seeded" || echo "  ⚠ Seed had issues — app will retry on launch"
fi

# ---- start frontend ----
echo ""
echo "▶  Starting Expo ($EXPO_FLAG)..."
echo ""
echo "  ┌─────────────────────────────────────────────┐"
echo "  │  iPhone testing:                             │"
echo "  │  • Install 'Expo Go' from the App Store      │"
if [[ "$EXPO_FLAG" == "--lan" ]]; then
echo "  │  • Join WiFi network: same as this Mac        │"
echo "  │    (your IP: $LOCAL_IP)             │"
fi
echo "  │  • Scan the QR code below with:              │"
echo "  │    iOS Camera app  OR  Expo Go > Scan        │"
echo "  └─────────────────────────────────────────────┘"
echo ""

cd "$FRONTEND_DIR"
./node_modules/.bin/expo start $EXPO_FLAG &
FRONTEND_PID=$!

echo ""
echo "══════════════════════════════════════════════════"
echo "  Backend  : http://localhost:${BACKEND_PORT}/api/"
echo "  Docs     : http://localhost:${BACKEND_PORT}/docs"
echo "  Metro    : http://localhost:8081"
echo "  Press Ctrl+C to stop everything"
echo "══════════════════════════════════════════════════"
echo ""

wait "$BACKEND_PID" "$FRONTEND_PID"
