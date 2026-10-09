# AGENTS.md

## Project

Xinghao ITIS — Multi-department IT & Operations management system (IT, Ops, QC, HR) built with Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS 3, Prisma (SQLite dev / PostgreSQL prod).

## Commands

```bash
npm run dev                        # Dev server
npm run build                      # Production build
npm run start                      # Start production (port 3005)
npm run db:setup                   # db push + generate + seed (fresh install)
npm run db:push                    # Push Prisma schema
npm run db:generate                # Regenerate Prisma client
npm run db:seed                    # Seed roles/divisions/users
node prisma/reset.js               # Reset database (SuperAdmin only)

# Migrasi data (sekali, setelah deploy)
npm run migrate:headset-status     # Status Headset lama -> Used/Good/Damage (item 11)
npm run migrate:delivery-orders    # Backfill DO untuk PR Approved tanpa DO (item 6)
```

## Architecture

- **Path alias**: `@/*` → `./src/*`
- **API routes**: `src/app/api/**/route.ts` — **hanya boleh export HTTP method** (GET/POST/PUT/DELETE). Konstanta & helper harus dipindah ke `src/lib/*`.
- **Pages**: `src/app/**/page.tsx` (client-side, fetch via `apiFetch()`)
- **Prisma singleton**: `src/lib/prisma.ts`
- **React Strict Mode**: disabled in `next.config.mjs`

## Design System

Semua warna, tipografi, dan spacing berasal dari **CSS variable di `src/app/globals.css`**._tailwind.config.ts memetakan token tersebut ke utility class.

- **Dilarang** menulis `bg-white`, `text-slate-*`, `text-gray-*`, atau hex warna langsung di komponen.
- Gunakan token: `bg-card`, `bg-muted`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-primary-subtle`, `text-danger`, `bg-success-subtle`, `bg-warning-subtle`, `bg-info-subtle`, `bg-danger-subtle`.
- **PENTING:** hanya boleh ada **satu** file konfigurasi Tailwind (`tailwind.config.ts`). Jangan pernah membuat `tailwind.config.js` bersamaan — file `.js` akan menang dan membuat dark mode tidak berfungsi.
- Komponen reusable: `src/components/ui/layout.tsx` (PageHeader, Panel, StatCard, Field, EmptyState, Skeleton, DescList), `data-display.tsx` (DataTable, StatusBadge, Pagination, Toolbar, SearchInput, CodeBadge), `form.tsx` (Modal, ConfirmDialog, MoneyInput, NumberInput, SubmitButton), `crud-page.tsx` (CrudPage untuk halaman CRUD sederhana).
- Helper CSS: `.surface-card`, `.xh-table-wrapper` / `.xh-table`, `.xh-input`, `.xh-select`, `.xh-btn-*`, `.xh-chip-*`, `.no-print`, `.print-only`.

## Authentication

- **Login**: `POST /api/auth/login` — bcrypt compare, lalu membuat **session server-side** dan mengeset cookie HttpOnly `xh_session`.
- **Sesi**: tabel `Session` (token disimpan sebagai SHA-256 hash). Setiap login menghapus sesi lama → rotasi token (anti session fixation).
- **Logout**: `DELETE /api/auth/session`.
- `GET /api/auth/session` untuk memulihkan sesi saat load.
- **PENTING — flag `Secure` cookie:** mengikuti skema request (`isHttpsRequest`), **BUKAN** `NODE_ENV`. Produksi berjalan di HTTP biasa (`http://192.168.52.140:3005`); memakai `NODE_ENV === 'production'` membuat browser membuang cookie sehingga sesi selalu berakhir. Set `COOKIE_SECURE=true` hanya bila aplikasi diakses lewat HTTPS / reverse proxy.
- `apiFetch()` otomatis mengarahkan ke `/login?reason=session-ended` saat menerima 401, sehingga user tidak melihat error "sesi berakhir" berulang di tiap panel.
- **Client**: `src/context/AuthContext.tsx` menyimpan profil user hasil login (`UserSession`) di state + `localStorage: itis_user`. Cookie HttpOnly tetap menjadi kredensial otoritatif — JANGAN pernah menulis user default/anonim di sana.
- **Server**: `src/lib/session.ts` menyediakan `getAuthContext`, `requireAuth`, `requirePermission`, `requireAnyPermission`, `requireSuperAdminPermission`.

## RBAC (Database-Driven)

Database adalah **satu-satunya sumber kebenaran** role & permission.

- Tabel `Role.permissions` berisi JSON: `{ "feature": ["create","read","update","delete"] }`.
- `User.roleId` → FK ke `Role`; `User.divisionId` → FK ke `Division`.
- **JANGAN** menulis daftar role/permission hardcoded. `src/lib/rbac.ts` hanya berisi kosakata (daftar feature & action) + helper murni.
- Feature key kanonik ada di `FEATURES` (`src/lib/rbac.ts`); `FEATURE_ALIASES` menjaga kompatibilitas (`transaction_item` → `transaction_headset`).
- Feature `employee_data` & `leave_request` dipisahkan dari `user_management` dengan sengaja: HR boleh mengelola data karyawan/cuti **tanpa** mendapat akses ke akun sistem. Jangan menggabungkannya kembali.
- Dashboard (`/api/dashboard`) kontennya berbeda per divisi dan divisi selalu dibaca dari **sesi**, bukan parameter URL. SuperAdmin boleh memakai `?division=IT|OPS|QC|HR`; user lain diabaikan.
- Menu sidebar dan RouteGuard membaca dari `src/lib/navigation.ts` — sama persis dengan feature yang divalidasi backend.
- Role `SUPERADMIN` otomatis lolos semua pengecekan.

## Navigasi

- `src/lib/navigation.ts` = sumber kebenaran menu (IT_NAV, OPS_NAV, QC_NAV, HR_NAV, ADMIN_NAV).
- Item 8: menu **"Pengajuan Vendor"** sudah dinamai **"Pengajuan"** (route `/transactions/vendor-submissions`, feature `vendor_submission`).

## Format utilities

`src/lib/format.ts`: `formatRupiah`, `formatNumber`, `formatDate`, `formatDateTime`, `parseRupiahInput`.
Nilai uang **selalu disimpan sebagai angka** di database; format hanya untuk tampilan/input.

## Conventions

- UI text: Bahasa Indonesia (dengan toggle EN di Navbar).
- Ikon: `lucide-react` (satu set saja).
- Client fetch: `apiFetch()` dari `useAuth()` (otomatis `credentials: 'same-origin'`).
- Route `page.tsx` yang butuh data user **wajib** `'use client'`.
- Hook harus dipanggil sebelum `return` bersyarat (hindari React error #310).
- Validasi angka harus memakai `isNegative()` dari `@/lib/documents`, **bukan** `toNumber(v, -1) < 0` — nilai kosong dianggap negatif bila memakai pola terakhir.
- Total/grand total selalu **dihitung ulang di server**; jangan percaya nilai dari client.

## Database

- **Dev**: SQLite at `prisma/dev.db`
- **Prod**: PostgreSQL
- Schema evolution memakai `prisma db push` (tidak ada folder migrations).
- Semua kolom baru dibuat **nullable / ber-default** agar data lama tidak rusak.

## Deployment

- **Path**: `/var/www/html/xingaho-itis`
- **Process**: PM2 (`pm2 start npm --name "xinghao-itis" -- start`)
- **Port**: 3005 (3000 dipakai Grafana)

### Update Routine

```bash
cd /var/www/html/xinghao-itis
rm -f pict/xh_logo_1.png          # obsolete, untracked — blokir git pull
git pull origin main
npm install
npx prisma db push
npm run build
pm2 restart xinghao-itis
```

Setelah upgrade versi besar, jalankan sekali:
```bash
npm run migrate:headset-status
npm run migrate:delivery-orders
```

## Pre-Revision Checklist

Sebelum push:
1. Baca `AGENTS.md` ini.
2. `npm run build` harus lulus.
3. Tidak ada warna hardcoded (`bg-white`, `text-slate-*`, hex) di `src/**`.
4. Tidak ada `route.ts` yang export non-HTTP-method.
5. Semua perubahan API memakai `requirePermission`/`requireAnyPermission`.
6. Hanya baru commit & push setelah build sukses.