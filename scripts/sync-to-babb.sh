#!/usr/bin/env bash
# sync-to-babb.sh — check workpadsdotme codec files against babb-codecs and propose version bumps.
# Run from the workpadsdotme repo root.
set -e

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BABB="$REPO_ROOT/../babb-codecs/scripts/sync-check.sh"

if [ ! -f "$BABB" ]; then
  echo "ERROR: babb-codecs not found at $REPO_ROOT/../babb-codecs"
  exit 1
fi

cd "$REPO_ROOT"

"$BABB" "js/lib/codec.js" workpads/web
