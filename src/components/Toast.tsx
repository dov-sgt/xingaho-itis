'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle, XCircle, AlertTriangle, X } from 'lucide-react';

interface Toast {
  id: number;
  type: 'success' | 'error' | 'warning';
  message: string;
}

interface ToastContextType {
  toast: (type: Toast['type'], message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

let toastId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((type: Toast['type'], message: string) => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const icons = {
    success: <CheckCircle className="h-4 w-4 text-emerald-500" />,
    error: <XCircle className="h-4 w-4 text-destructive" />,
    warning: <AlertTriangle className="h-4 w-4 text-amber-500" />,
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] space-y-2 max-w-sm">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "flex items-center gap-2 px-4 py-3 rounded-lg border shadow-lg text-xs font-medium animate-slide-in bg-background",
              t.type === 'success' && 'border-emerald-200 text-emerald-800',
              t.type === 'error' && 'border-destructive/20 text-destructive',
              t.type === 'warning' && 'border-amber-200 text-amber-800'
            )}
          >
            {icons[t.type]}
            <span className="flex-1">{t.message}</span>
            <button onClick={() => removeToast(t.id)} className="text-muted-foreground hover:text-foreground">
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
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
