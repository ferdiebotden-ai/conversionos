#!/bin/bash
# Sync source repo to deploy repo with all necessary transformations.
# Usage: ./scripts/sync-deploy.sh

set -euo pipefail

SRC="/Users/norbot/Norbot-Systems/products/conversionos"
DEPLOY="/Users/norbot/norbot-ops/products/demo"
PACKAGES="/Users/norbot/Norbot-Systems/packages"

echo "=== Syncing source to deploy ==="
rsync -av --delete \
  --exclude='.git' --exclude='node_modules' --exclude='.next' --exclude='.env*' \
  "$SRC/" "$DEPLOY/"

echo "=== Copying shared packages ==="
mkdir -p "$DEPLOY/packages"
for pkg in conversionos-admin-core conversionos-runtime conversionos-visualizer; do
  rsync -av --delete --exclude='node_modules' "$PACKAGES/$pkg/" "$DEPLOY/packages/$pkg/"
done

echo "=== Fixing import paths (monorepo -> project-local) ==="
cd "$DEPLOY"
# Universal fix: replace ANY depth of ../ before packages/ with the correct relative path
# Works for all depth levels (3, 4, 5, 6+) — calculates correct ../ count from file location
find src/ -type f \( -name "*.ts" -o -name "*.tsx" \) -print0 | xargs -0 grep -l "packages/conversionos" 2>/dev/null | while read f; do
  dir=$(dirname "$f")
  depth=$(echo "$dir" | tr '/' '\n' | wc -l | tr -d ' ')
  rel=""
  for i in $(seq 1 "$depth"); do rel="../$rel"; done
  # Replace any number of ../ before packages/ with the correct relative path
  sed -i '' -E "s|'\.\./(\.\./)*packages/|'${rel}packages/|g" "$f"
  sed -i '' -E "s|\"\.\./(\.\.\/)*packages/|\"${rel}packages/|g" "$f"
done

echo "=== Fixing turbopack root ==="
sed -i '' 's|root: path.join(configDir, "\.\./\.\.")|root: configDir|' next.config.ts

echo "=== Fixing package.json refs ==="
sed -i '' 's|"file:../../packages/conversionos-admin-core"|"file:./packages/conversionos-admin-core"|' package.json
sed -i '' 's|"file:../../packages/conversionos-runtime"|"file:./packages/conversionos-runtime"|' package.json
sed -i '' 's|"file:../../packages/conversionos-visualizer"|"file:./packages/conversionos-visualizer"|' package.json

echo "=== Adding .gitignore entries ==="
grep -q "packages/*/node_modules" .gitignore || echo "packages/*/node_modules" >> .gitignore

echo "=== Updating lint-staged config ==="
cat > .lintstagedrc.json << 'LINT'
{
  "!(packages/**)*.{ts,tsx}": ["eslint --fix"]
}
LINT

echo "=== Done ==="
