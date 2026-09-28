# Xinghao IT Information System (ITIS)

Sistem Informasi Manajemen Operasional, Inventaris, dan Layanan IT untuk Xinghao, dibangun berdasarkan spesifikasi dan data pada **Xinghao - ITIS.xlsx**.

---

## 🌟 Fitur Utama & Matriks Hak Akses (RBAC)

Sistem mengimplementasikan matriks hak akses resmi dari lembar kerja *Features*:

| No | Modul / Fitur | SuperAdmin | SPV | Staff | Vendor | Deskripsi |
|---|---|:---:|:---:|:---:|:---:|---|
| 1 | **Auth** | Ya | Ya | Ya | Ya | Autentikasi & manajemen sesi pengguna |
| 2 | **Dashboard** | Read | Read | Read | - | Statistik KPI, ringkasan stok, & grafik kategori |
| 3 | **Master Item** | CRUD | CRU | Read | - | 31 katalog master item resmi (PC, Laptop, Aksesoris) |
| 4 | **Master Vendor** | CRUD | CRU | Read | - | Data rekanan vendor (Swapro, TBS, Akulaku, dsb) |
| 5 | **Inventory & Stok** | CRUD | CRU | Read | - | Rekap stok in/out, unit laptop (28 unit), dan junk PC |
| 6 | **Transaksi Item** | CRUD | CRU | CR | - | Peminjaman headset, uang deposit (Rp 100k), return & resign |
| 7 | **Purchase Request** | CRUD | CRU | - | - | Pengadaan barang IT, total anggaran, approval workflow |
| 8 | **Delivery Order** | CRUD | CRU | - | - | Surat jalan pengiriman barang & tanda terima dari vendor |
| 9 | **Pengajuan Vendor** | UD | UD | Update | CR | Portal vendor untuk pengajuan penawaran & klaim garansi |
| 10 | **User Management** | CRUD | CRU | - | - | Manajemen pengguna, role, dan hak akses |
| 11 | **Reporting** | CRUD | CRU | Read | - | Rekapitulasi laporan operasional & ekspor Excel (.xlsx) |

*Keterangan*: C = Create, R = Read, U = Update, D = Delete, - = Tidak Ada Akses.

---

## 🔑 Akun Demo Siap Pakai

Sistem dilengkapi dengan fitur **Simulasi Role** di bar navigasi atas atau login langsung menggunakan akun berikut:

| Role | Username | Password | Deskripsi Akses |
|---|---|---|---|
| **SuperAdmin** | `superadmin` | `admin123` | Akses penuh seluruh modul dan fungsi CRUD |
| **SPV IT** | `spv` | `spv123` | Supervisi, persetujuan PR/Vendor, tanpa hapus master |
| **Staff IT** | `staff` | `staff123` | Operasional transaksi peminjaman & mutasi stok |
| **Vendor** | `vendor` | `vendor123` | Portal khusus pengajuan proposal & penawaran vendor |

---

## 🚀 Cara Menjalankan Sistem

### 1. Menjalankan Server Development Lokal
```bash
npm run dev
```
Akses sistem di browser: `http://localhost:3000`

### 2. Database & Data Seeding Ulang (Jika Diperlukan)
Untuk mengekstrak data dari `Xinghao - ITIS.xlsx` dan men-seed ulang database:
```bash
# 1. Ekstrak data dari Excel
python extract_data.py

# 2. Push skema & jalankan seeder
npx prisma db push
node prisma/seed.js
```

---

## 🖥️ Panduan Deployment ke Server Ubuntu (`/var/www/xinghao/itis`)

Sesuai catatan lembar *Features*:
1. Salin seluruh direktori proyek ke `/var/www/xinghao/itis` di server Ubuntu.
2. Di file `.env`, ubah koneksi database ke PostgreSQL:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/xinghao_itis?schema=public"
   ```
3. Ubah `provider = "postgresql"` di `prisma/schema.prisma`.
4. Jalankan:
   ```bash
   npm install
   npx prisma migrate deploy
   npm run build
   pm2 start npm --name "xinghao-itis" -- start
   ```
