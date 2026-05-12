#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV="$SCRIPT_DIR/.venv"
SWIFT_SRC="$SCRIPT_DIR/capture_system.swift"
SWIFT_BIN="$SCRIPT_DIR/capture_system"

# ── Python virtual environment ─────────────────────────────────────────────────

if [ ! -d "$VENV" ]; then
  echo "[agent] Creating Python virtual environment..."
  python3 -m venv "$VENV"
fi

"$VENV/bin/pip" install -q -r "$SCRIPT_DIR/requirements.txt"

# ── ScreenCaptureKit audio binary ──────────────────────────────────────────────
# Compiled once; recompiled automatically when the source changes.

if [ ! -f "$SWIFT_BIN" ] || [ "$SWIFT_SRC" -nt "$SWIFT_BIN" ]; then
  if ! command -v swiftc &> /dev/null; then
    echo "[agent] Warning: Swift compiler not found — system audio capture unavailable."
    echo "[agent]          To enable: xcode-select --install"
  else
    echo "[agent] Compiling system audio capture tool..."
    swiftc -O \
      -framework CoreAudio \
      -framework AVFoundation \
      -framework Foundation \
      "$SWIFT_SRC" -o "$SWIFT_BIN"
    echo "[agent] capture_system compiled."
  fi
fi

# ── Start agent ────────────────────────────────────────────────────────────────

echo "[agent] Starting Transcriber Agent on ws://localhost:8765"
"$VENV/bin/python" "$SCRIPT_DIR/main.py"
