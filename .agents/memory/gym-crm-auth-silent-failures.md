---
name: Gym CRM admin mutation silent failures
description: Why admin "button does nothing" bugs happen — public GET + auth-gated POST + missing onError
---

# "Save button does nothing" on admin pages

When an admin action (e.g. Save Plan on /admin/plans) appears to do nothing, the cause is usually a **silent mutation failure**, not broken wiring.

**Why it looks broken but isn't:**
- Many GET endpoints are **public** (e.g. `GET /api/plans`, `/website`, `/trainers`, `/gallery`), but the matching **POST/PATCH/DELETE require the admin signed cookie**.
- So an admin page can fully render (public GET succeeds) even when the session cookie is missing/expired. The first **write** then 401s.
- React Query mutations historically had only `onSuccess` and no `onError`, so a 401/400/500/network failure produced **zero user feedback** → "the button doesn't work."

**How to apply:**
- Always attach `onError` to mutations and surface a destructive toast. Branch on `ApiError.status === 401` to show a "session expired" message and redirect to `/login` (the `custom-fetch` throws `ApiError` with a `.status` field and a built `.message`).
- Also pass an `onInvalid` to `form.handleSubmit(onSubmit, onInvalid)` so client-side Zod validation failures are visible.
- When debugging, verify the backend first with an authed curl (login to get the cookie, then POST) before assuming a frontend bug — the chain is usually correct; the missing piece is error visibility.
