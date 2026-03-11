# Codex project config

This folder is used by the [OpenAI Codex app](https://developers.openai.com/codex/app) for project-specific setup and actions. Configure these in the Codex app settings (they are stored here so they can be shared in git).

## Recommended setup script

When Codex creates a new worktree, run:

```
npm install
```

So dependencies are available in the worktree.

## Recommended actions

Add these in the Codex app for quick access:

| Action        | Command |
|---------------|--------|
| Start dev server | `npm run dev` |
| Apply polish patch | `node scripts/polish/apply-polish-patch.mjs --site-id $SITE_ID` |

For the polish action, set `SITE_ID` in the environment or replace `$SITE_ID` with the tenant’s site_id when running.

## Recommended automation prompt

Use `codex-polish/AUTOMATION_PROMPT.md` as the source prompt for a recurring Codex automation. A practical first schedule is every 1-2 hours while the app is running.

## Tenant polish workflow

For the full polish workflow (dump → Codex → apply), see `codex-polish/README.md`.
