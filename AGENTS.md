# AGENTS.md

## Project

Xinghao IT Information System (ITIS) — an IT inventory & operations management app built with Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS 3, and Prisma (SQLite in dev).

## Commands

```bash
# Dev
npm run dev

# Build & start (production)
npm run build
npm run start

# Database
npm run db:push          # Push Prisma schema to SQLite
npm run db:generate      # Regenerate Prisma client
npm run db:seed          # Seed database from prisma/data/*.json

# Extract data from Excel (requires Python + openpyxl)
python extract_data.py   # Reads "Xinghao - ITIS.xlsx" -> writes prisma/data/*.json
```

There is no test suite, no CI, and no linter config beyond `next lint`.

## Architecture

- **Path alias**: `@/*` maps to `./src/*` (configured in `tsconfig.json`).
- **API routes**: All backend logic lives in `src/app/api/**/route.ts` as Next.js route handlers (GET/POST/PUT/DELETE).
- **Pages**: `src/app/**/page.tsx` — client-side rendered, data fetched from the API routes.
- **Prisma singleton**: `src/lib/prisma.ts` uses the globalThis pattern to avoid connection exhaustion in dev.
- **React Strict Mode is disabled** in `next.config.mjs` — do not re-enable without understanding why.

## Authentication & RBAC

There is **no real authentication**. Auth is a client-side role simulation:

- `src/lib/auth.ts` — hardcoded demo users (superadmin, spv, staff, vendor).
- `src/context/AuthContext.tsx` — React context that stores the current user in `localStorage` under key `itis_user`. Provides `apiFetch()` helper that automatically attaches the `x-user` header.
- `src/lib/rbac.ts` — role-permission matrix (`ROLE_PERMISSIONS`) gating UI features by role.
- `src/lib/session.ts` — server-side auth check for API routes. Validates the `x-user` header against demo users.
- The app auto-logs in as **SuperAdmin** by default. Role switching is done via the Navbar buttons (not a real login flow).
- The `/login` page exists but is a stub — it does not validate credentials.

When adding a new feature, you must:
1. Add the `Feature` to `rbac.ts`.
2. Add permissions for each role in `ROLE_PERMISSIONS`.
3. Add the menu item to `Sidebar.tsx` with the correct `feature` key.
4. Add server-side permission check in the API route using `requirePermission()`.

## API Validation

All API routes use validation helpers from `src/lib/validation.ts`:
- `validateRequired(value, fieldName)` — checks for null/undefined/empty.
- `validateString(value, fieldName, min, max)` — validates string length.
- `validateNumber(value, fieldName, min, max)` — validates numeric range.
- `validateInt(value, fieldName, min, max)` — validates integer range.
- `validateEmail(value, fieldName)` — validates email format.
- `validateEnum(value, fieldName, allowed)` — validates against allowed values.
- `validateRole(value)` — validates role against known roles.

API responses use helpers from `src/lib/api.ts`:
- `ok(data, status)` — success response.
- `badRequest(message)` — 400 response.
- `unauthorized(message)` — 401 response.
- `forbidden(message)` — 403 response.
- `notFound(message)` — 404 response.
- `serverError(message)` — 500 response.
- `validationError(errors)` — 400 with validation details.

## Database & Seeding

- **Dev**: SQLite at `prisma/dev.db` (`DATABASE_URL="file:./dev.db"` in `.env`).
- **Prod**: PostgreSQL (see README for deploy instructions) — requires changing `provider` in `schema.prisma`.
- **Seed pipeline**: `Xinghao - ITIS.xlsx` -> `extract_data.py` -> JSON files in `prisma/data/` -> `prisma/seed.js` -> database.
- The seed script **truncates headset transactions to 500 records** for fast seeding (`transactions_headset.json` may contain more).
- Some seed data (delivery orders, vendor submissions) is hardcoded in `prisma/seed.js`, not in JSON files.
- **Passwords are hashed** using bcrypt (via `bcryptjs`) in both the seed script and user API routes.

## UI Components

- **Toast notifications**: Use `useToast()` from `src/components/Toast.tsx`. ToastProvider is in the root layout.
- **Loading states**: All submit buttons have `saving` state that disables the button and shows "Menyimpan..." text.
- **Confirmations**: All destructive actions (delete, status change) use `confirm()` before proceeding.

## Conventions

- UI text is in Indonesian (Bahasa Indonesia) — keep new copy consistent.
- Use `lucide-react` for icons.
- Styling: Tailwind CSS with a custom `brand` color palette (indigo-based).
- No ESLint or Prettier config — match existing code style.
- All client-side fetch calls must use `apiFetch()` from AuthContext to ensure the auth header is sent.
