import React from 'react';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/* Page header                                                         */
/* ------------------------------------------------------------------ */

export function PageHeader({
  title,
  description,
  icon: Icon,
  actions,
  className,
}: {
  title: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-5', className)}>
      <div className="min-w-0">
        <div className="flex items-center gap-2.5">
          {Icon && (
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-subtle text-primary-subtle-foreground">
              <Icon className="h-4 w-4" />
            </span>
          )}
          <h1 className="truncate text-xl font-bold tracking-tight text-foreground">{title}</h1>
        </div>
        {description && (
          <p className="mt-1.5 text-[12.5px] text-muted-foreground sm:pl-[42px]">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Section (card)                                                      */
/* ------------------------------------------------------------------ */

export function Panel({
  title,
  description,
  actions,
  children,
  className,
  bodyClassName,
  padded = true,
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  padded?: boolean;
}) {
  return (
    <section className={cn('surface-card overflow-hidden', className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
          <div className="min-w-0">
            {title && <h2 className="text-[13px] font-bold text-foreground">{title}</h2>}
            {description && <p className="mt-0.5 text-[11.5px] text-muted-foreground">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={cn(padded && 'p-4', bodyClassName)}>{children}</div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Stat card                                                           */
/* ------------------------------------------------------------------ */

const STAT_TONE = {
  primary: 'bg-primary-subtle text-primary-subtle-foreground',
  success: 'bg-success-subtle text-success-subtle-foreground',
  warning: 'bg-warning-subtle text-warning-subtle-foreground',
  danger: 'bg-danger-subtle text-danger-subtle-foreground',
  info: 'bg-info-subtle text-info-subtle-foreground',
  neutral: 'bg-muted text-muted-foreground-strong',
} as const;

export type StatTone = keyof typeof STAT_TONE;

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'primary',
  onClick,
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  tone?: StatTone;
  onClick?: () => void;
  className?: string;
}) {
  const Comp: any = onClick ? 'button' : 'div';
  return (
    <Comp
      onClick={onClick}
      className={cn(
        'surface-card flex w-full items-start gap-3 p-4 text-left transition-shadow',
        onClick && 'hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
    >
      {Icon && (
        <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', STAT_TONE[tone])}>
          <Icon className="h-4.5 w-4.5" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-bold leading-none tabular-nums text-foreground">{value}</p>
        {hint && <p className="mt-1.5 text-[11px] text-muted-foreground">{hint}</p>}
      </div>
    </Comp>
  );
}

/* ------------------------------------------------------------------ */
/* Empty state                                                         */
/* ------------------------------------------------------------------ */

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  compact = false,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center', compact ? 'py-8' : 'py-14')}>
      {Icon && (
        <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Icon className="h-6 w-6" />
        </span>
      )}
      <p className="text-[13.5px] font-semibold text-foreground">{title}</p>
      {description && <p className="mt-1 max-w-sm text-[12px] text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Skeletons                                                           */
/* ------------------------------------------------------------------ */

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('relative overflow-hidden rounded-md bg-muted', className)} />;
}

export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="w-full overflow-hidden rounded-xl border border-border">
      <div className="border-b border-border bg-table-header px-3 py-2.5">
        <Skeleton className="h-3 w-40" />
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-3 border-b border-border/70 px-3 py-2.5 last:border-b-0">
          {Array.from({ length: cols }).map((__, c) => (
            <Skeleton key={c} className={cn('h-3', c === 0 ? 'w-16' : 'flex-1')} />
          ))}
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Form field                                                          */
/* ------------------------------------------------------------------ */

export function Field({
  label,
  required,
  error,
  hint,
  htmlFor,
  children,
  className,
}: {
  label?: string;
  required?: boolean;
  error?: string | null;
  hint?: string;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('min-w-0', className)}>
      {label && (
        <label htmlFor={htmlFor} className="xh-label">
          {label}
          {required && <span className="ml-0.5 text-danger">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="mt-1 text-[11px] font-medium text-danger">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Definition list (detail view)                                       */
/* ------------------------------------------------------------------ */

export function DescList({ items }: { items: { label: string; value: React.ReactNode }[] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((it) => (
        <div key={it.label} className="min-w-0">
          <dt className="text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">{it.label}</dt>
          <dd className="mt-0.5 truncate text-[13px] font-medium text-foreground">{it.value ?? '-'}</dd>
        </div>
      ))}
    </dl>
  );
}