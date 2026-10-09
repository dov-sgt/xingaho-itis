/**
 * Konstanta konfigurasi aplikasi.
 * Sesuai aturan proyek: nama/path logo, nama perusahaan, dan nilai konfigurasi
 * TIDAK boleh di-hardcode di dalam komponen.
 */

export const APP_NAME = 'Xinghao ITIS';
export const APP_SHORT_NAME = 'XH ITIS';
export const APP_DESCRIPTION = 'IT Information System Staff & Operasional';

/** Badan usaha pemilik sistem — dipakai di copyright, dokumen, dan cetakan. */
export const COMPANY_LEGAL_NAME = 'PT Xinghao Technology';

/** Nama singkat yang tampil di header dokumen. */
export const COMPANY_DISPLAY_NAME = 'PT Xinghao Technology';

export const COMPANY_TAGLINE = 'IT Information System Staff & Operasional';

/** Copyright lengkap. Tahun dibuat otomatis agar tidak perlu diperbarui tiap tahun. */
export const COPYRIGHT_TEXT = `© ${new Date().getFullYear()} ${COMPANY_LEGAL_NAME}. Seluruh hak cipta dilindungi.`;

/** Jumlah baris per halaman untuk tabel yang memakai pagination client-side. */
export const DEFAULT_PAGE_SIZE = 10;

/** Ambang stok menipis — nilai di bawah ini ditampilkan merah tebal (item 10). */
export const LOW_STOCK_THRESHOLD = 10;

/** Kategori katalog yang boleh dipilih pada form Pengajuan Headset (item 13). */
export const HEADSET_ITEM_CATEGORY = 'Accessories';

/** Kategori pengajuan yang mewajibkan pemilihan item katalog (item 13). */
export const HEADSET_SUBMISSION_CATEGORY = 'Headset';