---
name: Railway/nixpacks pnpm install
description: How to make pnpm work in Railway nixpacks builds for this monorepo, and which approaches fail.
---

# Railway / nixpacks pnpm install

This repo deploys to Railway as a SINGLE service via root `railway.json` + `nixpacks.toml` (api-server serves the built gym-crm frontend). The install phase must get pnpm onto PATH; several common approaches fail.

## What works
Install pnpm directly as a nix package, no corepack:
```toml
[phases.setup]
nixPkgs = ["nodejs_22", "pnpm"]
[phases.install]
cmds = ["pnpm install --frozen-lockfile"]
```
pnpm is on PATH at both build and runtime (nix packages persist into the image), so the `releaseCommand` (`pnpm --filter @workspace/db run push-force`) also works.

## What FAILS (don't retry these)
- `npm install -g pnpm && pnpm install` → `pnpm: command not found`. **Why:** npm's global bin is NOT on PATH in the nixpacks install phase. Same reason `npm install -g corepack@latest` won't help.
- `corepack enable && corepack prepare pnpm@X --activate` → `Internal Error: cannot find matching keyid`. **Why:** corepack bundled with nixpacks' Node 22.11 (~v0.29) has outdated signing keys and predates `COREPACK_INTEGRITY_KEYS`, so that env-var workaround is silently ignored.
- `nixPkgs = ["nodejs_24"]` → `error: undefined variable 'nodejs_24'`. **Why:** nixpacks' pinned nixpkgs only has up to nodejs_22.

## Related
- Do NOT add a `packageManager` field to root package.json for this — with nix-provided pnpm it's unnecessary and pnpm's package-manager-strict check can error on a version mismatch. The project runs fine without it.
- Railway only redeploys after the user pushes to GitHub; Replit checkpoints alone don't reach Railway.
