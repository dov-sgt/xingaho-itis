'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useToast } from '@/components/Toast';

export interface ListParams {
  search?: string;
  status?: string;
  page?: number;
  pageSize?: number;
  extra?: Record<string, string>;
}

export interface UseListResult<T> {
  rows: T[];
  setRows: React.Dispatch<React.SetStateAction<T[]>>;
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  reload: () => void;
  search: string;
  setSearch: (v: string) => void;
  status: string;
  setStatus: (v: string) => void;
  page: number;
  setPage: (p: number) => void;
  summary: Record<string, number>;
  /** Jalankan mutasi POST/PUT/DELETE dengan pesan error yang konsisten. */
  mutate: (url: string, options: RequestInit, successMessage?: string) => Promise<any | null>;
}

/**
 * Hook daftar generik untuk halaman CRUD.
 * Menangani: fetching, search (debounce), filter status, pagination, error toast,
 * dan mutasi (create/update/delete) dengan pesan sukses/gagal.
 *
 * API dianggap mengembalikan `{ data, pagination?, summary? }` atau array biasa.
 */
export function useList<T = any>(
  endpoint: string,
  apiFetch: (url: string, options?: RequestInit) => Promise<Response>,
  options: { searchDebounce?: number; enabled?: boolean } = {},
): UseListResult<T> {
  const { searchDebounce = 350, enabled = true } = options;
  const { toast } = useToast();

  const [rows, setRows] = useState<T[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10, total: 0, totalPages: 1 });
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  // Debounce pencarian agar tidak memicu request per ketikan.
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, searchDebounce);
    return () => clearTimeout(t);
  }, [searchInput, searchDebounce]);

  const load = useCallback(
    async (silent = false) => {
      if (!enabled) {
        setLoading(false);
        return;
      }
      if (silent) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const qs = new URLSearchParams({ page: String(page), pageSize: '10' });
        if (search.trim()) qs.set('search', search.trim());
        if (status) qs.set('status', status);

        const res = await apiFetch(`${endpoint}?${qs}`);
        const json = await res.json().catch(() => null);

        if (!res.ok) {
          throw new Error(json?.error || json?.details?.join(', ') || `Gagal memuat ${endpoint}`);
        }

        if (Array.isArray(json)) {
          setRows(json);
          setPagination({ page: 1, pageSize: 10, total: json.length, totalPages: 1 });
        } else {
          setRows(json?.data ?? []);
          setPagination(json?.pagination ?? { page, pageSize: 10, total: (json?.data ?? []).length, totalPages: 1 });
          if (json?.summary) setSummary(json.summary);
        }
      } catch (e: any) {
        setError(e.message);
        toast('error', e.message);
        setRows([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [apiFetch, endpoint, page, search, status, enabled],
  );

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  const mutate = useCallback(
    async (url: string, init: RequestInit, successMessage?: string) => {
      try {
        const res = await apiFetch(url, init);
        const json = await res.json().catch(() => null);
        if (!res.ok) throw new Error(json?.error || json?.details?.join(', ') || 'Permintaan gagal');
        if (successMessage) toast('success', successMessage);
        return json;
      } catch (e: any) {
        toast('error', e.message);
        return null;
      }
    },
    [apiFetch, toast],
  );

  return {
    rows,
    setRows,
    pagination,
    loading,
    refreshing,
    error,
    reload: () => load(true),
    search: searchInput,
    setSearch: setSearchInput,
    status,
    setStatus,
    page,
    setPage,
    summary,
    mutate,
  };
}

/** Opsi select status generik. */
export function useStatusFilter(options: string[] = ['Pending', 'Approved', 'Rejected']) {
  return useMemo(() => options, [options.join('|')]);
}