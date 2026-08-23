import { useEffect, useId, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  Info,
  Layers,
  OctagonX,
  PlayCircle,
  Sparkles,
  X,
} from 'lucide-react';
import clsx from 'clsx';

const orderStatusMeta: Record<
  string,
  { className: string; icon: typeof CheckCircle2; label: string }
> = {
  DRAFT: {
    className: 'bg-ink-100 text-ink-700',
    icon: CircleDashed,
    label: 'Draft',
  },
  CONFIRMED: {
    className: 'bg-info-100 text-info-800',
    icon: Info,
    label: 'Confirmed',
  },
  IN_PRODUCTION: {
    className: 'bg-info-50 text-info-800 ring-1 ring-info-100',
    icon: PlayCircle,
    label: 'In production',
  },
  COMPLETED: {
    className: 'bg-success-100 text-success-800',
    icon: CheckCircle2,
    label: 'Completed',
  },
  CANCELLED: {
    className: 'bg-danger-100 text-danger-800',
    icon: OctagonX,
    label: 'Cancelled',
  },
};

const orderTypeMeta: Record<
  string,
  { className: string; icon: typeof CheckCircle2; label: string }
> = {
  Standard: {
    className: 'bg-ink-100 text-ink-700',
    icon: Layers,
    label: 'Standard',
  },
  Customised: {
    className: 'bg-info-50 text-info-800 ring-1 ring-info-100',
    icon: Sparkles,
    label: 'Customised',
  },
};

const machineStatusMeta: Record<
  string,
  { className: string; dot: string; label: string }
> = {
  RUNNING: {
    className: 'bg-success-50 text-success-800',
    dot: 'bg-success-700',
    label: 'Running',
  },
  IDLE: {
    className: 'bg-ink-100 text-ink-700',
    dot: 'bg-ink-400',
    label: 'Idle',
  },
  WARNING: {
    className: 'bg-warning-50 text-warning-800',
    dot: 'bg-warning-700',
    label: 'Warning',
  },
  STOPPED: {
    className: 'bg-danger-50 text-danger-800',
    dot: 'bg-danger-700',
    label: 'Stopped',
  },
};

export function StatusBadge({ status }: { status: string }) {
  const meta = orderStatusMeta[status] ?? {
    className: 'bg-ink-100 text-ink-700',
    icon: CircleDashed,
    label: status.replaceAll('_', ' '),
  };
  const Icon = meta.icon;
  return (
    <span className={clsx('badge', meta.className)}>
      <Icon className="h-3 w-3 shrink-0" aria-hidden />
      {meta.label}
    </span>
  );
}

export function OrderTypeBadge({ orderType }: { orderType: string }) {
  const meta = orderTypeMeta[orderType] ?? {
    className: 'bg-ink-100 text-ink-700',
    icon: Layers,
    label: orderType,
  };
  const Icon = meta.icon;
  return (
    <span className={clsx('badge', meta.className)}>
      <Icon className="h-3 w-3 shrink-0" aria-hidden />
      {meta.label}
    </span>
  );
}

export function MachineStatusBadge({ status }: { status: string }) {
  const meta = machineStatusMeta[status] ?? machineStatusMeta.IDLE;
  return (
    <span className={clsx('badge', meta.className)}>
      <span className={clsx('h-1.5 w-1.5 rounded-full', meta.dot)} aria-hidden />
      {meta.label}
    </span>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-3 flex flex-col gap-3 sm:mb-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-[clamp(1.125rem,4vw,1.5rem)] font-bold tracking-tight text-ink-900">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-1 text-sm leading-snug text-ink-600">{subtitle}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">
          {actions}
        </div>
      ) : null}
    </div>
  );
}

export function KpiCard({
  label,
  value,
  hint,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info';
}) {
  const toneBar: Record<string, string> = {
    neutral: 'bg-brand-600',
    success: 'bg-success-700',
    warning: 'bg-warning-700',
    danger: 'bg-danger-700',
    info: 'bg-info-700',
  };
  return (
    <div className="card-panel relative overflow-hidden">
      <div
        className={clsx('absolute inset-y-0 left-0 w-1', toneBar[tone])}
        aria-hidden
      />
      <p className="pl-2 text-2xs font-semibold uppercase tracking-wide text-ink-500">
        {label}
      </p>
      <p className="mt-1 pl-2 font-mono text-xl font-semibold tabular-nums text-ink-900 sm:text-2xl">
        {value}
      </p>
      {hint ? <p className="mt-1 pl-2 text-xs text-ink-500">{hint}</p> : null}
    </div>
  );
}

export function AlertBanner({
  severity,
  title,
  detail,
  time,
}: {
  severity: 'critical' | 'warning' | 'info';
  title: string;
  detail: string;
  time: string;
}) {
  const styles = {
    critical:
      'border-danger-700/25 bg-danger-50/70 backdrop-blur-md',
    warning:
      'border-warning-700/25 bg-warning-50/70 backdrop-blur-md',
    info: 'border-info-700/20 bg-info-50/70 backdrop-blur-md',
  };
  const Icon =
    severity === 'critical'
      ? OctagonX
      : severity === 'warning'
        ? AlertTriangle
        : Info;
  return (
    <div
      className={clsx(
        'flex gap-3 rounded-2xl border px-3 py-2.5 shadow-sm',
        styles[severity],
      )}
      role={severity === 'critical' ? 'alert' : 'status'}
    >
      <Icon
        className={clsx(
          'mt-0.5 h-4 w-4 shrink-0',
          severity === 'critical' && 'text-danger-700',
          severity === 'warning' && 'text-warning-700',
          severity === 'info' && 'text-info-700',
        )}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-sm font-semibold text-ink-900">{title}</p>
          <time className="text-2xs font-medium text-ink-500">{time}</time>
        </div>
        <p className="mt-0.5 text-xs text-ink-600">{detail}</p>
      </div>
    </div>
  );
}

function getModalRoot(): HTMLElement {
  if (typeof document === 'undefined') {
    throw new Error('Modal requires a browser environment');
  }
  let root = document.getElementById('modal-root');
  if (!root) {
    root = document.createElement('div');
    root.id = 'modal-root';
    document.body.appendChild(root);
  }
  return root;
}

export function Modal({
  open,
  title,
  children,
  onClose,
  footer,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
}) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="app-modal-layer" role="presentation">
      <button
        type="button"
        className="app-modal-backdrop"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="app-modal-panel glass-modal"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-white/40 px-4 py-3">
          <h2 id={titleId} className="text-base font-bold text-ink-900">
            {title}
          </h2>
          <button
            type="button"
            className="btn-ghost h-9 w-9 min-h-0 rounded-xl p-0"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">{children}</div>
        {footer ? (
          <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-white/40 px-4 py-3 sm:flex-row sm:justify-end">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    getModalRoot(),
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="card-panel text-center text-sm text-ink-500">{message}</div>
  );
}
