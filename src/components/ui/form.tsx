'use client';

import React, { useEffect, useRef, useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatNumberInput, parseRupiahInput } from '@/lib/format';

/* ------------------------------------------------------------------ */
/* Modal                                                               */
/* ------------------------------------------------------------------ */

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  const width = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }[size];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-foreground/40 p-4 py-8 backdrop-blur-[2px] animate-fade-in">
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn('w-full rounded-xl border border-border bg-overlay shadow-xl outline-none animate-slide-up', width)}
      >
        <header className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <h2 className="text-[14px] font-bold text-foreground">{title}</h2>
            {description && <p className="mt-0.5 text-[11.5px] text-muted-foreground">{description}</p>}
          </div>
          <button onClick={onClose} aria-label="Tutup" className="xh-btn xh-btn-ghost xh-btn-sm h-7 w-7 p-0">
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="max-h-[70vh] overflow-y-auto scrollbar-thin px-4 py-4">{children}</div>
        {footer && (
          <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-border bg-surface-raised/60 px-4 py-3">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Confirm dialog                                                      */
/* ------------------------------------------------------------------ */

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Konfirmasi',
  cancelLabel = 'Batal',
  tone = 'danger',
  loading,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'primary';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      size="sm"
      footer={
        <>
          <button className="xh-btn xh-btn-secondary" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </button>
          <button
            className={tone === 'danger' ? 'xh-btn xh-btn-danger' : 'xh-btn xh-btn-primary'}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {confirmLabel}
          </button>
        </>
      }
    >
      <div className="text-[13px] leading-relaxed text-muted-foreground-strong">{message}</div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Money input (format Rupiah realtime, mengirim angka)                */
/* ------------------------------------------------------------------ */

export function MoneyInput({
  value,
  onChange,
  id,
  placeholder = '0',
  disabled,
  className,
}: {
  /** Selalu number. */
  value: number;
  onChange: (n: number) => void;
  id?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}) {
  const [text, setText] = useState(() => formatNumberInput(value));
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setText(formatNumberInput(value));
  }, [value]);

  return (
    <div className={cn('relative', className)}>
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[12px] font-semibold text-muted-foreground">
        Rp
      </span>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        disabled={disabled}
        value={text}
        placeholder={placeholder}
        onFocus={() => {
          focused.current = true;
        }}
        onBlur={() => {
          focused.current = false;
          setText(formatNumberInput(value));
        }}
        onChange={(e) => {
          const next = e.target.value;
          setText(next);
          onChange(parseRupiahInput(next));
        }}
        className="xh-input pl-9 text-right tabular-nums"
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Number input                                                        */
/* ------------------------------------------------------------------ */

export function NumberInput({
  value,
  onChange,
  id,
  min = 0,
  max,
  step = 1,
  disabled,
  className,
}: {
  value: number;
  onChange: (n: number) => void;
  id?: string;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <input
      id={id}
      type="number"
      inputMode="numeric"
      disabled={disabled}
      min={min}
      max={max}
      step={step}
      value={Number.isFinite(value) ? value : 0}
      onChange={(e) => {
        const n = e.target.value === '' ? 0 : Number(e.target.value);
        onChange(Number.isFinite(n) ? n : 0);
      }}
      className={cn('xh-input text-right tabular-nums', className)}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Submit button                                                       */
/* ------------------------------------------------------------------ */

export function SubmitButton({
  loading,
  children,
  className,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) {
  return (
    <button type="submit" disabled={loading || rest.disabled} className={cn('xh-btn xh-btn-primary', className)} {...rest}>
      {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      {children}
    </button>
  );
}