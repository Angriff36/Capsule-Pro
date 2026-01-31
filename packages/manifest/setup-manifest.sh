#!/bin/bash
# Setup script to link Manifest into capsule-pro workspace

set -e

MANIFEST_REPO="../Manifest"
PACKAGE_DIR="$(pwd)"

echo "Setting up @repo/manifest package..."

# Check if Manifest repo exists
if [ ! -d "$MANIFEST_REPO" ]; then
  echo "❌ Manifest repo not found at $MANIFEST_REPO"
  echo "   Please ensure Manifest is cloned at: $(dirname $PACKAGE_DIR)/Manifest"
  exit 1
fi

# Copy source files
echo "📦 Copying Manifest source files..."
mkdir -p "$PACKAGE_DIR/src/manifest"
cp -r "$MANIFEST_REPO/src/manifest"/* "$PACKAGE_DIR/src/manifest/"

# Update index.ts
echo "📝 Updating index.ts..."
cat > "$PACKAGE_DIR/src/index.ts" << 'EOF'
/**
 * @repo/manifest
 * 
 * Manifest Language Runtime and Compiler
 */

export * from './manifest/runtime-engine';
export * from './manifest/ir-compiler';
export type * from './manifest/ir';
EOF

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "  1. cd ../.."
echo "  2. pnpm install"
echo "  3. cd packages/manifest"
echo "  4. pnpm build"
echo ""
echo "Then use in your code:"
echo "  import { RuntimeEngine, compileToIR } from '@repo/manifest';"
