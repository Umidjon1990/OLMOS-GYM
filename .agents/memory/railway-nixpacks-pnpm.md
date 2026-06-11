---
name: Railway/nixpacks pnpm install
description: How to make pnpm work in Railway nixpacks builds for this monorepo, and which approaches fail.
---

# Railway / nixpacks pnpm install

This repo deploys to Railway as a SINGLE service via root `railway.json` + `nixpacks.toml` (api-server serves the built gym-crm frontend). The install phase must get pnpm onto PATH; several common approaches fail.

## What works
Install the EXACT pnpm version (10.26.1, matching the lockfile generator) via pnpm's standalone installer; do NOT rely on corepack or nix's pnpm.
```toml
[variables]
PNPM_HOME = "/root/.local/share/pnpm"
[phases.setup]
nixPkgs = ["nodejs_22", "curl"]
[phases.install]
cmds = [
  "curl -fsSL https://get.pnpm.io/install.sh | env PNPM_VERSION=10.26.1 SHELL=sh sh -",
  "/root/.local/share/pnpm/pnpm install --frozen-lockfile",
]
```
Call pnpm by absolute path `/root/.local/share/pnpm/pnpm` in nixpacks build phase AND in railway.json `buildCommand` + `releaseCommand` (railway.json buildCommand overrides the nixpacks build phase, and plain `pnpm` is NOT on PATH).

## What FAILS (don't retry these)
- `npm install -g pnpm && pnpm install` → `pnpm: command not found`. **Why:** npm's global bin is NOT on PATH in the nixpacks install phase. Same reason `npm install -g corepack@latest` won't help.
- `corepack enable && corepack prepare pnpm@X --activate` → `Internal Error: cannot find matching keyid`. **Why:** corepack bundled with nixpacks' Node 22.11 (~v0.29) has outdated signing keys and predates `COREPACK_INTEGRITY_KEYS`, so that env-var workaround is silently ignored.
- `nixPkgs = ["nodejs_24"]` → `error: undefined variable 'nodejs_24'`. **Why:** nixpacks' pinned nixpkgs only has up to nodejs_22.
- `nixPkgs = ["nodejs_22", "pnpm"]` + `pnpm install --frozen-lockfile` → `ERR_PNPM_LOCKFILE_CONFIG_MISMATCH` on "overrides". **Why:** nixpkgs' pnpm is too old (~v9) and doesn't read pnpm-10 `overrides`/`minimumReleaseAge` from pnpm-workspace.yaml, so its computed config differs from the lockfile written by pnpm 10.26.1. Frozen install needs the EXACT pnpm version.

## Related
- Do NOT add a `packageManager` field to root package.json for this — with nix-provided pnpm it's unnecessary and pnpm's package-manager-strict check can error on a version mismatch. The project runs fine without it.
- Railway only redeploys after the user pushes to GitHub; Replit checkpoints alone don't reach Railway.
