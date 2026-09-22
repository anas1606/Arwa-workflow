import React from 'react';
import {
  CheckCircle2,
  CircleDashed,
  Info,
  Layers,
  OctagonX,
  PlayCircle,
  Sparkles,
  Combine,
} from 'lucide-react';
import clsx from 'clsx';

export const orderStatusMeta = {
  DRAFT: {
    className: 'bg-grey-surface text-grey-text border border-grey-border',
    icon: CircleDashed,
    label: 'DRAFT',
  },
  CONFIRMED: {
    className: 'bg-primary/10 text-primary-dark border border-primary/20',
    icon: Info,
    label: 'CONFIRMED',
  },
  IN_PRODUCTION: {
    className: 'bg-warning/10 text-warning-dark border border-warning/20',
    icon: PlayCircle,
    label: 'IN PRODUCTION',
  },
  COMPLETED: {
    className: 'bg-success/10 text-success-dark border border-success/20',
    icon: CheckCircle2,
    label: 'COMPLETED',
  },
  CANCELLED: {
    className: 'bg-danger/10 text-danger-dark border border-danger/20',
    icon: OctagonX,
    label: 'CANCELLED',
  },
};

export const orderTypeMeta = {
  Standard: {
    className: 'bg-grey-surface text-grey-text-strong border border-grey-border',
    icon: Layers,
    label: 'STANDARD',
  },
  Customised: {
    className: 'bg-primary/10 text-primary-dark border border-primary/20',
    icon: Sparkles,
    label: 'CUSTOMISED',
  },
  Hybrid: {
    className: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
    icon: Combine,
    label: 'HYBRID',
  },
  CUSTOMIZE: {
    className: 'bg-primary/10 text-primary-dark border border-primary/20',
    icon: Sparkles,
    label: 'CUSTOMISED',
  },
  CUSTOMISED: {
    className: 'bg-primary/10 text-primary-dark border border-primary/20',
    icon: Sparkles,
    label: 'CUSTOMISED',
  },
  STANDARD: {
    className: 'bg-grey-surface text-grey-text-strong border border-grey-border',
    icon: Layers,
    label: 'STANDARD',
  },
  HYBRID: {
    className: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
    icon: Combine,
    label: 'HYBRID',
  },
};

export const machineStatusMeta = {
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

export function StatusBadge({ status }) {
  const meta = orderStatusMeta[status] ?? {
    className: 'bg-ink-100 text-ink-700',
    icon: CircleDashed,
    label: status?.replaceAll('_', ' ') || 'Unknown',
  };
  const Icon = meta.icon;
  return (
    <span className={clsx('badge', meta.className)}>
      <Icon className="h-3 w-3 shrink-0" aria-hidden />
      {meta.label}
    </span>
  );
}

export function OrderTypeBadge({ orderType }) {
  const meta = orderTypeMeta[orderType] ?? {
    className: 'bg-ink-100 text-ink-700',
    icon: Layers,
    label: orderType || 'Standard',
  };
  const Icon = meta.icon;
  return (
    <span className={clsx('badge', meta.className)}>
      <Icon className="h-3 w-3 shrink-0" aria-hidden />
      {meta.label}
    </span>
  );
}

export function MachineStatusBadge({ status }) {
  const meta = machineStatusMeta[status] ?? machineStatusMeta.IDLE;
  return (
    <span className={clsx('badge', meta.className)}>
      <span className={clsx('h-1.5 w-1.5 rounded-full', meta.dot)} aria-hidden />
      {meta.label}
    </span>
  );
}
