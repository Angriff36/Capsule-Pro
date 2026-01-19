#!/usr/bin/env bash
set -euo pipefail

# dep-align.sh
# Auto-align monorepo deps and versions as much as possible, then prompt for decisions.

log() { printf "\n==> %s\n" "$*"; }
die() { printf "\nERROR: %s\n" "$*" >&2; exit 1; }

# --- Preconditions ---
command -v pnpm >/dev/null 2>&1 || die "pnpm not found in PATH."

# Be reasonably sure we're in a repo root.
if [[ ! -f "package.json" ]]; then
  die "Run this from the repo root (no package.json found in current directory)."
fi

log "Step 0: Show current toolchain"
pnpm -v || true
node -v || true

# --- Step 1: Manypkg autofixes ---
# manypkg fix runs checks and fixes anything it can fix automatically.
log "Step 1: manypkg fix (autofix monorepo package.json issues it can fix)"
pnpm dlx @manypkg/cli fix

# --- Step 2: Syncpack autofix mismatches ---
# syncpack fix-mismatches auto-fixes dependency version mismatches it supports.
log "Step 2: syncpack fix-mismatches (autofix version mismatches)"
pnpm dlx syncpack fix-mismatches

# --- Step 3: Syncpack interactive prompts for the rest ---
# syncpack prompt displays prompts for mismatches it can't fix automatically.
log "Step 3: syncpack prompt (interactive decisions for remaining mismatches)"
pnpm dlx syncpack prompt

# --- Step 4 (optional): interactive upgrades across the workspace ---
# pnpm update --recursive --latest --interactive lets you choose upgrades interactively.
# This is OPTIONAL because it can create a lot of changes fast.
if [[ "${RUN_PNPM_UPDATE:-0}" == "1" ]]; then
  log "Step 4: pnpm update --recursive --latest --interactive (choose upgrades)"
  pnpm update --recursive --latest --interactive
else
  log "Step 4: skipped pnpm update (set RUN_PNPM_UPDATE=1 to enable)"
  log "Example: RUN_PNPM_UPDATE=1 ./dep-align.sh"
fi

log "Done. Review git diff, then run your normal install/build/test."
