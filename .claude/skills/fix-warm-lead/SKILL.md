# /fix-warm-lead — Fix and Redeploy a Warm-Lead Build

Fix platform issues and redeploy a specific warm-lead build. Copies updated shared packages, builds locally, deploys to Vercel, and verifies the live URL.

## Parse Arguments

From the user's input, extract:
- `{client-name}` — name of the warm-lead directory (e.g., `norbot-showcase`, `lrc-inc`)
- `all` — fix and redeploy ALL warm-lead builds

## Step 1: Locate the Warm-Lead

```bash
ls ../../products/warm-leads/{client-name}/package.json
```

Verify it exists. If `all`, list all deployable warm-leads:
```bash
for d in ../../products/warm-leads/*/; do
  [ -f "$d/package.json" ] && echo "$d"
done
```

## Step 2: Copy Updated Shared Packages

The warm-lead references shared packages via `file:../../../packages/`. For Vercel deploy, packages must be copied locally:

```bash
CLIENT_DIR="../../products/warm-leads/{client-name}"

mkdir -p "$CLIENT_DIR/packages"
cp -r ../../packages/conversionos-runtime "$CLIENT_DIR/packages/"
cp -r ../../packages/conversionos-admin-core "$CLIENT_DIR/packages/"
cp -r ../../packages/conversionos-visualizer "$CLIENT_DIR/packages/"
```

## Step 3: Transform package.json Refs

```bash
cd "$CLIENT_DIR"
cp package.json package.json.bak
sed -i '' 's|file:../../../packages/|file:./packages/|g' package.json
```

## Step 4: Build Locally

```bash
npm install
npm run build
```

If the build fails, diagnose and fix before proceeding. Common issues:
- Missing env vars — check `.env.local`
- TypeScript errors from package interface changes
- Import path mismatches

## Step 5: Deploy to Vercel

```bash
npx vercel --prod --yes
```

If the remote build fails (common with native deps or package issues), use prebuilt:
```bash
npx vercel build --prod
npx vercel deploy --prebuilt --prod --yes
```

## Step 6: Set Up Custom Domain (if new build)

```bash
npx vercel domains add {client-name}.norbotsystems.com
```

The wildcard DNS `*.norbotsystems.com` already points to Vercel via Cloudflare.

## Step 7: Restore Monorepo Refs

```bash
cp package.json.bak package.json
rm package.json.bak
rm -rf packages/
```

This restores the monorepo `file:../../../packages/` references for local development.

## Step 8: Verify the Live URL

```bash
curl -sL -o /dev/null -w "%{http_code}" https://{client-name}.norbotsystems.com/
```

Should return 200. If Playwright MCP is available, take a screenshot to verify visually.

## For `/fix-warm-lead all`

Loop through all deployable warm-lead directories and run steps 2-8 for each. Skip directories without a `package.json`.

Report a summary table at the end:
| Client | Status | URL |
|--------|--------|-----|
| norbot-showcase | Deployed | https://norbot-showcase.norbotsystems.com |
| lrc-inc | Deployed | https://lrc-inc.norbotsystems.com |
| ... | ... | ... |

## Common Issues

- **Vercel 402 (image optimization):** Ensure `images.unoptimized: true` in `next.config.ts`
- **SSL cert limit:** Subdomain names must be under 64 characters total
- **CSP font errors:** Check `next.config.ts` Content-Security-Policy headers
- **Package version mismatch:** Delete `node_modules` and `package-lock.json`, then `npm install`
- **Codex CLI broken:** If `codex` hangs, use `claude -p` fallback (see brain/gotchas.md)
