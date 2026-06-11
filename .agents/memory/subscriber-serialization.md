---
name: Subscriber response serialization
description: All subscriber API responses must go through formatSubscriber so numeric fields stay Number, not pg strings.
---

# Subscriber response serialization

Every endpoint in `artifacts/api-server/src/routes/subscribers.ts` that returns a subscriber (list, get-by-id, create, update) must serialize through the shared `formatSubscriber` helper.

**Why:** Postgres/Drizzle returns `numeric` columns (e.g. `debtAmount`, `price`) as JS strings. The OpenAPI contract types them as `number`, so spreading the raw DB row (`...row.subscriber`) returns a string and silently violates the contract — generated client types become wrong and frontend math/formatting breaks. The bug surfaces only on endpoints that bypass the helper (a code review caught get-by-id/create/update still spreading raw rows after the list handler was fixed).

**How to apply:** When adding or editing any subscriber-returning route, return `await formatSubscriber(row, planName)` rather than spreading the DB row. Same principle applies to any other table with `numeric` columns — convert with `Number()` in one shared serializer, never per-route.
