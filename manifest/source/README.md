# `manifest/source/` — Manifest text sources

**This directory is the canonical home of the `.manifest` source files**
(constitution §4a; see [`manifest/README.md`](../README.md) for the full
artifact layout). Sources are organized by domain subdirectory (`ai/`,
`core/`, `crm/`, `events/`, `finance/`, `integrations/`, `inventory/`,
`kitchen/`, `operations/`, `platform/`, `procurement/`, `quality/`,
`staff/`) and are read by `manifest/scripts/compile.mjs`.

The legacy `packages/manifest-adapters/manifests/` location is retired
(2026-06-03) and **non-authoritative**. Like the other `packages/manifest-*`
paths, it is a forbidden resurrection path (constitution §4a/§19a) — do not
recreate it or point new code, config, or docs at it.

```bash
# Compile sources to IR:
pnpm manifest:compile

# List sources:
ls manifest/source/*/
```
