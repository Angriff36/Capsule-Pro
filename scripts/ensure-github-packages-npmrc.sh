#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd -- "$script_dir/.." && pwd)"
npmrc="$repo_root/.npmrc"

registry_line="@angriff36:registry=https://npm.pkg.github.com"
token="${PKG_AUTH_TOKEN:-${GITHUB_PACKAGES_TOKEN:-${NPM_TOKEN:-}}}"

touch "$npmrc"

if ! grep -qxF "$registry_line" "$npmrc"; then
  printf '\n%s\n' "$registry_line" >> "$npmrc"
fi

if [ -n "$token" ]; then
  tmp_file="$(mktemp)"
  grep -v '^//npm\.pkg\.github\.com/:_authToken=' "$npmrc" > "$tmp_file" || true
  printf '//npm.pkg.github.com/:_authToken=%s\n' "$token" >> "$tmp_file"
  mv "$tmp_file" "$npmrc"
  echo "Configured GitHub Packages auth for @angriff36."
  exit 0
fi

if [ -n "${VERCEL:-}" ] || [ -n "${CI:-}" ]; then
  echo "Missing PKG_AUTH_TOKEN, GITHUB_PACKAGES_TOKEN, GITHUB_TOKEN, or NPM_TOKEN for GitHub Packages auth." >&2
  exit 1
fi

echo "No GitHub Packages token found in the environment; continuing for local install."
