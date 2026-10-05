# AGENTS.md

## Project

Xinghao ITIS — Multi-department IT & Operations management system (IT, Ops, QC, HR) built with Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS 3, Prisma (SQLite dev / PostgreSQL prod).

## Commands

```bash
npm run dev              # Dev server
npm run build            # Production build
npm run start            # Start production
npm run db:push          # Push Prisma schema
npm run db:generate      # Regenerate Prisma client
npm run db:seed          # Seed database (IT users only)
node prisma/reset.js     # Reset database (SuperAdmin only)
```

## Architecture

- **Path alias**: `@/*` → `./src/*`
- **API routes**: `src/app/api/**/route.ts` (GET/POST/PUT/DELETE)
- **Pages**: `src/app/**/page.tsx` (client-side, fetch from API)
- **Prisma singleton**: `src/lib/prisma.ts` (globalThis pattern)
- **React Strict Mode**: disabled in `next.config.mjs`

## Authentication

- **Real auth**: Login API at `src/app/api/auth/login/route.ts` validates username/password against database (bcrypt)
- **AuthContext**: `src/context/AuthContext.tsx` — stores user in `localStorage` key `itis_user`, provides `apiFetch()` with `x-user` header
- **Session check**: `src/lib/session.ts` — validates `x-user` header against demo users
- **Login page**: `src/app/login/page.tsx` — proper form with validation
- **Root redirect**: `/` → `/login` (if not authenticated) or `/dashboard` (if authenticated)

## RBAC

- **Roles**: SUPERADMIN, MANAGER_OPS, SPV_OPS, LEADER_OPS, AGEN, SPV_QC, STAFF_QC, SPV_HR, STAFF_HR
- **Divisions**: IT, OPS, QC, HR
- **Permission matrix**: `src/lib/rbac.ts` — `ROLE_PERMISSIONS[role][feature]`
- **Division access**: Users only see their own division; SuperAdmin sees all
- **Server-side check**: `requirePermission(req, feature, action)` in API routes

## UI Features

- **Dark mode**: Toggle in Navbar, CSS variables in `globals.css`, `darkMode: 'class'` in tailwind config
- **Language**: ID/EN toggle in Navbar, `src/lib/i18n.ts` for translations
- **Toast**: `useToast()` from `src/components/Toast.tsx`
- **Theme**: shadcn-style CSS variables (HSL), minimalist design

## Database

- **Dev**: SQLite at `prisma/dev.db`
- **Prod**: PostgreSQL (change `provider` in `schema.prisma`)
- **Seed**: `prisma/seed.js` — creates IT users only (superadmin, spv_it, staff_it)
- **Reset**: `prisma/reset.js` — clears all data, creates only SuperAdmin

## Conventions

- UI text: Indonesian (default) with English toggle
- Icons: `lucide-react`
- Styling: Tailwind CSS with shadcn-style CSS variables
- All client fetch: use `apiFetch()` from AuthContext
- All forms: loading state on submit, `confirm()` on destructive actions
- Tables: compact `text-[11px]`, `py-2 px-3` padding

## Deployment

- **Path**: `/var/www/html/xinghao-itis`
- **Process**: PM2 (`pm2 start npm --name "xinghao-itis" -- start`)
- **Port**: 3005 (3000 used by Grafana)
- **Update**: `git pull && npm run build && pm2 restart xinghao-itis`

## Pre-Revision Checklist

Before pushing any changes:
1. Read this AGENTS.md
2. Run `npm run build` locally — must pass
3. Check all role references match `Role` type in `rbac.ts`
4. Check all Prisma model references match `schema.prisma`
5. Only push after build succeeds
