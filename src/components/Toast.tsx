'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle2, XCircle, AlertTriangle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  toast: (type: ToastType, message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

let toastId = 0;

/** Warna toast memakai token tema agar konsisten di light & dark mode. */
const TONE: Record<ToastType, { box: string; icon: React.ReactNode }> = {
  success: {
    box: 'border-success/30 bg-success-subtle text-success-subtle-foreground',
    icon: <CheckCircle2 className="h-4 w-4 text-success" />,
  },
  error: {
    box: 'border-danger/30 bg-danger-subtle text-danger-subtle-foreground',
    icon: <XCircle className="h-4 w-4 text-danger" />,
  },
  warning: {
    box: 'border-warning/30 bg-warning-subtle text-warning-subtle-foreground',
    icon: <AlertTriangle className="h-4 w-4 text-warning" />,
  },
  info: {
    box: 'border-info/30 bg-info-subtle text-info-subtle-foreground',
    icon: <AlertTriangle className="h-4 w-4 text-info" />,
  },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((type: ToastType, message: string) => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  const removeToast = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Toast tidak ikut tercetak saat print/PDF (lihat globals.css). */}
      <div className="no-print pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[min(92vw,360px)] flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cn(
              'pointer-events-auto flex items-start gap-2.5 rounded-xl border px-3.5 py-3 shadow-lg animate-slide-up',
              TONE[t.type].box,
            )}
          >
            <span className="mt-px shrink-0">{TONE[t.type].icon}</span>
            <span className="min-w-0 flex-1 text-[12.5px] font-medium leading-relaxed">{t.message}</span>
            <button
              onClick={() => removeToast(t.id)}
              aria-label="Tutup notifikasi"
              className="shrink-0 rounded p-0.5 opacity-60 transition-opacity hover:opacity-100"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
}