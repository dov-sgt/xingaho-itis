/**
 * Konstanta konfigurasi aplikasi.
 * Sesuai aturan proyek: nama/path logo dan nilai konfigurasi TIDAK boleh
 * di-hardcode di dalam komponen.
 */

export const APP_NAME = 'Xinghao ITIS';
export const APP_SHORT_NAME = 'XH ITIS';
export const APP_DESCRIPTION = 'IT Information System Staff & Operasional';

/**
 * Jumlah baris per halaman untuk tabel yang memakai pagination client-side.
 * Sejalan dengan konstanta `LOW_STOCK_THRESHOLD` yang juga berarti "10".
 */
export const DEFAULT_PAGE_SIZE = 10;

/** Ambang stok menipis — nilai di bawah ini ditampilkan merah tebal (item 10). */
export const LOW_STOCK_THRESHOLD = 10;

/** Kategori katalog yang boleh dipilih pada form Pengajuan Headset (item 13). */
export const HEADSET_ITEM_CATEGORY = 'Accessories';

/** Kategori pengajuan yang mewajibkan pemilihan item katalog (item 13). */
export const HEADSET_SUBMISSION_CATEGORY = 'Headset';