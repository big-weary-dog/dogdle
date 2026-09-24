#!/bin/bash
# Installs dev dependencies in fresh Claude Code on the web sessions so `npm test` works
# straight away. Local machines manage their own node_modules, so this is remote-only.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

# install rather than ci: the container is snapshotted after this hook, and install
# reuses what's already there instead of wiping node_modules every time.
npm install --no-audit --no-fund
