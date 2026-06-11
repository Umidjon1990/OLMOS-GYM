---
name: Admin auth route gating
description: How admin/public API routes are protected, and the method-vs-path gating trap that exposed privileged endpoints.
---

# Admin auth route gating

Auth is a single admin (ADMIN_USERNAME/ADMIN_PASSWORD env) → signed httpOnly cookie set by `POST /api/auth/login`. Guards live in `api-server/src/middlewares/requireAuth.ts`; route gating is centralized in `api-server/src/routes/index.ts`.

## The trap (severe, caught in review)
A method-only allowlist (`allowMethods("POST")`) on a router that mixes a public endpoint with admin endpoints of the **same method** leaks the admin ones. Example: applications has public `POST /` (create from landing page) but admin `POST /:id/approve` and `POST /:id/reject` — `allowMethods("POST")` made approve/reject public = privilege escalation.

**Rule:** `allowMethods(...)` is only safe when *every* route of those methods on that router is genuinely public. If a router mixes public + protected at the same method, use `allowWhen(predicate)` with a path check instead.

**Why:** `req.path` inside the mounted guard is relative to the router mount point, so the public-create guard is `req.method === "POST" && req.path === "/"`. Anything deeper (`/:id/...`) falls through to `requireAuth`.

## How to apply
- Adding a new router with both public reads and admin writes: GET-only-public → `allowMethods("GET")`; mixed same-method → `allowWhen`.
- Public API surface (landing page): GET plans/website/trainers/gallery, POST /applications (create only), and all of /auth. Everything else requires the cookie.
- Verify any auth change with the curl authz matrix: unauth must 401 on protected, public must NOT 401.
