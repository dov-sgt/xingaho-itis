/**
 * Format & parse helpers untuk nilai uang Rupiah.
 * Nilai SELALU disimpan di database sebagai angka (Float/Decimal), tidak pernah
 * string — helper ini hanya untuk tampilan & input.
 */

export function formatRupiah(value: number | string | null | undefined, withPrefix = true): string {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return withPrefix ? 'Rp 0' : '0';
  const formatted = new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
  return withPrefix ? `Rp ${formatted}` : formatted;
}

/** Angka saja (tanpa pemisah) untuk input yang sedang diketik. */
export function formatNumberInput(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return '0';
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(n);
}

export function parseRupiahInput(raw: string): number {
  if (!raw) return 0;
  const cleaned = raw
    .replace(/[^\d,.-]/g, '')
    .replace(/,(?=\d{3}(\D|$))/g, '.')
    .replace(/,/g, '');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '-';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '-';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function formatNumber(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return '0';
  return new Intl.NumberFormat('id-ID').format(n);
}