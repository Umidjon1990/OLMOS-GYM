# FitZone Gym CRM

Gym CRM boshqaruv tizimi — obunachi, to'lov, reja va veb-sayt kontentini boshqarish uchun to'liq stack web ilova (o'zbek tilida).

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — API server ishga tushirish (port 8080)
- `pnpm --filter @workspace/gym-crm run dev` — Frontend ishga tushirish
- `pnpm run typecheck` — barcha paketlar bo'yicha to'liq typecheck
- `pnpm run build` — typecheck + build barcha paketlar
- `pnpm --filter @workspace/api-spec run codegen` — OpenAPI spec dan React Query hooks va Zod sxemalarini qayta generatsiya qilish
- `pnpm --filter @workspace/db run push` — DB sxema o'zgarishlarini yuborish (faqat dev)
- Required env: `DATABASE_URL` — Postgres ulanish stringi, `SESSION_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 + signed-cookie admin auth (bitta admin login)
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (import from `"zod"`, NOT `"zod/v4"` — esbuild bundle incompatible)
- API codegen: Orval (from OpenAPI spec)
- Frontend: React + Vite + Tailwind CSS v4 + wouter router
- Build: esbuild (ESM bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — API kontrakt (source of truth)
- `lib/db/src/schema/` — Drizzle ORM sxemalari (plans, subscribers, payments, website, applications, notifications, gallery, trainers)
- `lib/api-client-react/src/generated/` — Orval tomonidan generatsiya qilingan React Query hooks
- `artifacts/api-server/src/routes/` — Express route handlerlari
- `artifacts/gym-crm/src/pages/` — Frontend sahifalari
- `artifacts/gym-crm/src/App.tsx` — Router va Clerk auth setup

## Architecture decisions

- Contract-first API: OpenAPI spec → Orval codegen → typed hooks va schemas
- Admin auth: bitta admin (ADMIN_USERNAME/ADMIN_PASSWORD env) signed httpOnly cookie bilan kiradi. `/login` sahifa, `/admin/*` frontend va backend himoyalangan; `/` public landing page. Public API: GET /plans, /website, /trainers, /gallery va POST /applications ochiq
- Barcha route fayllarda `zod` dan import qilinadi (`"zod"`, `"zod/v4"` EMAS — esbuild resolve qila olmaydi)
- Mobile-first dizayn: bottom nav bar (mobil), sidebar (desktop)
- API server paths rewrite qilinmaydi — barcha routelar full base path bilan ishlaydi

## Product

- **Public landing page**: FitZone Gym haqida ma'lumot, rejalar, trenerlar, aloqa
- **Admin panel** (admin login bilan himoyalangan):
  - Dashboard: statistika (jami/faol obunachi, daromad, yangi arizalar)
  - Obunachlar: qidirish, filter, profil ko'rish, qo'shish/tahrirlash
  - Rejalar: narx va davomiylik boshqaruvi
  - To'lovlar: tarix, tasdiqlash
  - Arizalar: yangi arizalar ro'yxati
  - Trenerlar: profil va ixtisoslik
  - Galereya: rasm boshqaruvi
  - Sayt sozlamalari: gym nomi, aloqa, ijtimoiy tarmoqlar

## User preferences

- MOBILE-FIRST dizayn majburiy
- O'zbek tilida interfeys
- Dark navy + electric blue rang sxemasi

## Gotchas

- `zod/v4` subpath esbuild bundle da resolve qilinmaydi — har doim `"zod"` dan import qiling
- `pnpm run dev` workspace rootda ishga tushirilmaydi — workflow orqali bajaring
- Leaf packagelar root `tsconfig.json` references ga qo'shilmaydi

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
