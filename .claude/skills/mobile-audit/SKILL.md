# /mobile-audit — Audit and Fix Mobile Responsiveness

Audit and fix mobile responsiveness for a ConversionOS site or warm-lead build. Tests at 375px, 768px, 1024px viewports using Playwright screenshots.

## Parse Arguments

From the user's input, extract:
- `{site-name}` — name of the warm-lead (e.g., `norbot-showcase`, `lrc-inc`)
- `platform` — audit the main ConversionOS platform instead

## Step 1: Identify the Target

If `site-name` is `platform`, use the main ConversionOS dev server (`npm run dev`, port 3000).
Otherwise, look for `../../products/warm-leads/{site-name}/`.

Verify the directory exists:
```bash
ls ../../products/warm-leads/{site-name}/package.json
```

## Step 2: Start the Dev Server

```bash
# For warm-leads:
cd ../../products/warm-leads/{site-name} && npm run dev &

# For platform:
npm run dev &
```

Wait for the server to be ready (check with `curl -s http://localhost:3000/`).

## Step 3: Screenshot at 3 Breakpoints

Use Playwright MCP to capture screenshots at:
- **375px width** (mobile phone — iPhone SE)
- **768px width** (tablet — iPad)
- **1024px width** (small laptop)

Pages to test:
1. Homepage `/`
2. Admin dashboard `/admin`
3. Visualiser `/visualizer`
4. Services section (scroll down on homepage)

For each page at each width:
1. Set viewport: `browser_resize(width, 900)`
2. Navigate to the URL
3. Take screenshot
4. Check for: horizontal overflow, text truncation, overlapping elements, tiny touch targets (<44px), unreadable text

## Step 4: Fix Issues

Common mobile fixes in Tailwind:
- **Grid overflow:** `grid-cols-4` → `grid-cols-1 md:grid-cols-2 lg:grid-cols-4`
- **Text too large:** `text-5xl` → `text-2xl md:text-5xl`
- **Padding too wide:** `px-16` → `px-4 md:px-16`
- **Fixed widths:** `w-[600px]` → `w-full max-w-[600px]`
- **Hidden on mobile:** `hidden md:flex` for desktop-only elements
- **Stack on mobile:** `flex-row` → `flex-col md:flex-row`
- **Touch targets:** minimum 44x44px for interactive elements

Focus on sections in `src/sections/` — these are the dynamic homepage components shared across all tenants.

## Step 5: Verify Fixes

Re-screenshot at all 3 breakpoints to confirm the fixes work. No horizontal scroll, no overflow, all text readable.

## Step 6: Deploy (if warm-lead)

After fixing, use `/fix-warm-lead {site-name}` to deploy the changes.

## Output

Report:
- Pages tested with screenshot evidence
- Issues found (list each with the breakpoint where it occurs)
- Fixes applied (file + line changes)
- Verification screenshots showing the fix
