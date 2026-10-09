# AGENTS.md

## Project

Xinghao ITIS - Multi-department IT & Operations management system (IT, Ops, QC, HR) built with Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS 3, Prisma (SQLite dev / PostgreSQL prod).

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

- **Path alias**: `@/*` -> `./src/*`
- **API routes**: `src/app/api/**/route.ts` - **hanya boleh export HTTP method** (GET/POST/PUT/DELETE). Konstanta & helper harus dipindah ke `src/lib/*`.
- **Pages**: `src/app/**/page.tsx` (client-side, fetch via `apiFetch()`)
- **Prisma singleton**: `src/lib/prisma.ts`
- **React Strict Mode**: disabled in `next.config.mjs`

## Design System

Semua warna, tipografi, dan spacing berasal dari **CSS variable di `src/app/globals.css`**._tailwind.config.ts memetakan token tersebut ke utility class.

- **Dilarang** menulis `bg-white`, `text-slate-*`, `text-gray-*`, atau hex warna langsung di komponen.
- Gunakan token: `bg-card`, `bg-muted`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-primary-subtle`, `text-danger`, `bg-success-subtle`, `bg-warning-subtle`, `bg-info-subtle`, `bg-danger-subtle`.
- **PENTING:** hanya boleh ada **satu** file konfigurasi Tailwind (`tailwind.config.ts`). Jangan pernah membuat `tailwind.config.js` bersamaan - file `.js` akan menang dan membuat dark mode tidak berfungsi.
- Komponen reusable: `src/components/ui/layout.tsx` (PageHeader, Panel, StatCard, Field, EmptyState, Skeleton, DescList), `data-display.tsx` (DataTable, StatusBadge, Pagination, Toolbar, SearchInput, CodeBadge), `form.tsx` (Modal, ConfirmDialog, MoneyInput, NumberInput, SubmitButton), `crud-page.tsx` (CrudPage untuk halaman CRUD sederhana).
- Helper CSS: `.surface-card`, `.xh-table-wrapper` / `.xh-table`, `.xh-input`, `.xh-select`, `.xh-btn-*`, `.xh-chip-*`, `.no-print`, `.print-only`.

## Authentication

- **Login**: `POST /api/auth/login` - bcrypt compare, lalu membuat **session server-side** dan mengeset cookie HttpOnly `xh_session`.
- **Sesi**: tabel `Session` (token disimpan sebagai SHA-256 hash). Setiap login menghapus sesi lama -> rotasi token (anti session fixation).
- **Logout**: `DELETE /api/auth/session`.
- `GET /api/auth/session` untuk memulihkan sesi saat load.
- **PENTING - flag `Secure` cookie:** mengikuti skema request (`isHttpsRequest`), **BUKAN** `NODE_ENV`. Produksi berjalan di HTTP biasa (`http://192.168.52.140:3005`); memakai `NODE_ENV === 'production'` membuat browser membuang cookie sehingga sesi selalu berakhir. Set `COOKIE_SECURE=true` hanya bila aplikasi diakses lewat HTTPS / reverse proxy.
- `apiFetch()` otomatis mengarahkan ke `/login?reason=session-ended` saat menerima 401, sehingga user tidak melihat error "sesi berakhir" berulang di tiap panel.
- **Client**: `src/context/AuthContext.tsx` menyimpan profil user hasil login (`UserSession`) di state + `localStorage: itis_user`. Cookie HttpOnly tetap menjadi kredensial otoritatif - JANGAN pernah menulis user default/anonim di sana.
- **Server**: `src/lib/session.ts` menyediakan `getAuthContext`, `requireAuth`, `requirePermission`, `requireAnyPermission`, `requireSuperAdminPermission`.

## RBAC (Database-Driven)

Database adalah **satu-satunya sumber kebenaran** role & permission.

- Tabel `Role.permissions` berisi JSON: `{ "feature": ["create","read","update","delete"] }`.
- `User.roleId` -> FK ke `Role`; `User.divisionId` -> FK ke `Division`.
- **JANGAN** menulis daftar role/permission hardcoded. `src/lib/rbac.ts` hanya berisi kosakata (daftar feature & action) + helper murni.
- Feature key kanonik ada di `FEATURES` (`src/lib/rbac.ts`); `FEATURE_ALIASES` menjaga kompatibilitas (`transaction_item` -> `transaction_headset`).
- Feature `employee_data` & `leave_request` dipisahkan dari `user_management` dengan sengaja: HR boleh mengelola data karyawan/cuti **tanpa** mendapat akses ke akun sistem. Jangan menggabungkannya kembali.
- Dashboard (`/api/dashboard`) kontennya berbeda per divisi dan divisi selalu dibaca dari **sesi**, bukan parameter URL. SuperAdmin boleh memakai `?division=IT|OPS|QC|HR`; user lain diabaikan.
- Menu sidebar dan RouteGuard membaca dari `src/lib/navigation.ts` - sama persis dengan feature yang divalidasi backend.
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
- Validasi angka harus memakai `isNegative()` dari `@/lib/documents`, **bukan** `toNumber(v, -1) < 0` - nilai kosong dianggap negatif bila memakai pola terakhir.
- Total/grand total selalu **dihitung ulang di server**; jangan percaya nilai dari client.

## Database

- **Dev**: SQLite at `prisma/dev.db`
- **Prod**: PostgreSQL
- Schema evolution memakai `prisma db push` (tidak ada folder migrations).
- Semua kolom baru dibuat **nullable / ber-default** agar data lama tidak rusak.

## Logo perusahaan

`src/components/BrandLogo.tsx` memakai rantai fallback:

1. `/pict/xh_logo_1.png` - aset PNG utama, **di-commit ke repository**. Keberadaannya dicek satu kali per halaman (`probePrimaryAsset`, di-cache di level modul).
2. `/pict/xh_logo.svg` - aset vektor cadangan yang juga di-commit.
3. `<LogoMark />` - SVG inline, tanpa request jaringan sama sekali.
4. Wordmark teks - selalu tampil, tidak pernah kosong.

- `public/pict/xh_logo_1.png` (512x512 RGBA) dibuat oleh `scripts/generate-logo.js`. Untuk memakai logo resmi perusahaan, **ganti file PNG itu** dengan nama file yang sama - tidak perlu ubah kode.
- `scripts/verify-exports.js` memverifikasi bahwa semua dokumen unduhan benar-benar memuat logo.
- Warna logo sengaja TIDAK mengikuti tema: logo adalah aset merek, sama di light dan dark mode.
- Favicon: `src/app/icon.svg` (App Router, otomatis).

## Dokumen unduhan

**Logo TIDAK disematkan ke berkas Excel.** Kolom data harus tetap bersih agar
berkas langsung bisa diolah/pivot di Excel. Identitas perusahaan tetap ada di
sheet `Kop` (`.xlsx`) dan di baris metadata `#` (`.csv`).

| Endpoint | Format | Identitas perusahaan |
| --- | --- | --- |
| `/api/transactions/items/template` | `.xlsx` | Sheet `Petunjuk` + kop teks |
| `/api/transactions/items/template?format=csv` | `.csv` | Baris metadata `#` |
| `/api/reports/export?format=xlsx` | `.xlsx` | Sheet `Kop` |
| `/api/reports/export?format=csv` | `.csv` | Baris metadata `#` |
| `/print/purchase-request/[id]` | PDF (print browser) | Inline SVG, selalu tampil |

- Definisi kolom laporan ada di `src/lib/report-columns.ts` - dipakai bersama oleh halaman Reporting dan endpoint ekspor, sehingga tampilan layar dan isi berkas selalu identik.
- `scripts/verify-exports.js` memverifikasi 15 endpoint: workbook `.xlsx` harus terbaca, punya baris data, dan **tidak** memuat `xl/media`/`drawings` (kembalinya gambar logo dianggap kegagalan). Jalankan dengan server aktif.

## Encoding karakter (PENTING)

Bug "GoTo <mojibake> Swapro" terjadi karena byte UTF-8 pernah dibaca sebagai
Windows-1252. Middle dot UTF-8 adalah `C2 B7`; kalau dibaca sebagai CP1252
menjadi `A-circumflex B-middle-dot`. Dua lapis pertahanan:

1. **Source ASCII-only.** Semua teks user-visible ditulis ASCII. Pakai
   `&rarr;` / `&lt;` / `&copy;` (HTML entity) untuk simbol, bukan karakter
   Unicode mentah. Tanda hubung biasa, bukan em dash; `->`, bukan panah.
   - `npm run lint:charset` (juga jalan otomatis di `prebuild`) - gagal kalau
     ada mojibake, byte menggantung, BOM, atau karakter CJK di `src/`.
   - `scripts/audit-charset.js` juga menyisir `AGENTS.md`, jadi dokumentasi ini
     pun tidak boleh memuat karakter rusak secara harfiah.
2. **Respons API menyebut charset.** Semua helper di `src/lib/api.ts` menulis
   `Content-Type: application/json; charset=utf-8`, supaya data non-ASCII dari
   database tidak salah decode di browser.

## Validasi kolom wajib vs Prisma

Kolom Prisma yang `String` (bukan `String?`) **wajib** diisi. Mengirim `null`
akan menjadi HTTP 500, bukan pesan validasi yang berguna.

- `npm run lint:fields` (juga jalan di `prebuild`) - membaca `prisma/schema.prisma`
  dan menandai route `buildCrudHandlers` yang mengirim `null` ke kolom wajib.
- Kalau kolomnya boleh diisi otomatis, defaultkan dari sesi lewat argumen kedua
  `toCreate(body, auth)`. Contoh: `StockOutTransaction.requestedBy` memakai
  `auth.name`.
- Kolom yang hanya relevan untuk sebagian user (mis. `Booking.endDate`) lebih
  baik di-`validate()` daripada dibiarkan null.

## Map dan permission

- `CrudPage` menebak feature key dari path URL bila `createFeature` tidak
  diberikan. `/stock-out-transactions` menjadi `stock-out-transactions` yang
  tidak pernah cocok dengan permission -> tombol aksi tersembunyi.
- Karena itu `src/lib/rbac.ts` punya peta eksplisit `ENDPOINT_FEATURE`
  (endpoint -> feature). **Setiap halaman `CrudPage` wajib mengoper
  `createFeature`/`updateFeature`/`deleteFeature` secara eksplisit.**
- Backend selalu validasi penuh: `requirePermission(req, feature, action)` di
  setiap method. Menyembunyikan tombol di UI bukan pengganti.

## Modal - jebakan focus

`Modal` di `src/components/ui/form.tsx` menyimpan `onClose` di ref. Halaman
lazim mengoper `onClose={() => setX(false)}` (fungsi baru tiap render).
Kalau `useEffect` Modal bergantung pada `onClose`, efeknya re-run tiap render
dan `ref.current.focus()` **mencuri fokus dari input** - gejalanya "mengetik satu
karakter harus klik lagi". Jangan diubah tanpa testar ulang input form.

## Copyright

Selalu ambil dari `src/lib/config.ts` - jangan menulis nama perusahaan langsung di komponen:

- `COMPANY_LEGAL_NAME` = `PT Xinghao Technology`
- `COPYRIGHT_TEXT` = `(c) <tahun> PT Xinghao Technology. Seluruh hak cipta dilindungi.`

## Deployment

- **Path**: `/var/www/html/xingaho-itis`
- **Process**: PM2 (`pm2 start npm --name "xinghao-itis" -- start`)
- **Port**: 3005 (3000 dipakai Grafana)

### Update Routine

```bash
cd /var/www/html/xinghao-itis
git pull origin main
npm install
npx prisma db push
npm run db:seed        # wajib bila permission role berubah
npm run build          # prebuild menjalankan audit charset + audit kolom wajib
pm2 restart xinghao-itis
npm run verify:exports # butuh server aktif, harus "Lulus : 15"
```

Setelah upgrade versi besar, jalankan sekali:
```bash
npm run migrate:headset-status
npm run migrate:delivery-orders
```

### Kalau `pm2 restart` gagal / port 3005 tertahan

`[PM2][ERROR] Process or Namespace xinghao-itis not found` tapi `pm2 list`
menampilkan prosesnya: nama PM2 tidak sinkron. Bersihkan lalu buat ulang:

```bash
pm2 delete all || pm2 kill
fuser -k 3005/tcp || true      # pastikan port 3005 bebas
pm2 start npm --name "xinghao-itis" -- start
pm2 save
pm2 startup systemd            # hanya sekali, agar auto-start saat reboot
```

## Verifikasi

Jalankan dengan server aktif di `http://127.0.0.1:3005`:

```bash
npm run verify:exports       # 15 pemeriksaan berkas unduhan
node scripts/verify-fixes.js # 19 pemeriksaan regresi untuk 10 perbaikan terakhir
```

## Pre-Revision Checklist

Sebelum push:
1. Baca `AGENTS.md` ini.
2. `npm run build` harus lulus (otomatis menjalankan `lint:charset` + `lint:fields`).
3. Tidak ada warna hardcoded (`bg-white`, `text-slate-*`, hex) di `src/**`.
4. Tidak ada `route.ts` yang export non-HTTP-method.
5. Semua perubahan API memakai `requirePermission`/`requireAnyPermission`.
6. Semua teks user-visible ASCII (lihat bagian Encoding karakter).
7. Hanya baru commit & push setelah build sukses.
