# `manifest/source/` — Manifest text sources

The `.manifest` source files currently live at
**`packages/manifest-adapters/manifests/`** because they ship with the
adapters package that consumes them at runtime.

This directory is a layout marker. If/when the source files are relocated
to top-level (e.g. so they can be consumed by multiple packages), the
canonical home is `manifest/source/`.

```bash
# Compile sources to IR:
pnpm manifest:compile

# List sources:
ls packages/manifest-adapters/manifests/
```
