#!/usr/bin/env bash
# Enable the repo's Git hooks (auto-push on commit) for the current clone.
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

chmod +x .githooks/*
git config core.hooksPath .githooks

echo "✓ hooks enabled: core.hooksPath = $(git config --get core.hooksPath)"
echo "  post-commit hook will now auto-push the current branch to origin."
